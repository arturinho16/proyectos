import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import { getSatSessionFromRequest } from '@/lib/sat/session-store';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIMITE_BYTES = 2 * 1024 * 1024 * 1024;
const UMBRAL_ALERTA_BYTES = Math.floor(1.9 * 1024 * 1024 * 1024);

function obtenerTamanoCarpeta(dirPath: string): number {
    let size = 0;

    if (!fs.existsSync(dirPath)) {
        return 0;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            size += obtenerTamanoCarpeta(filePath);
        } else {
            size += stats.size;
        }
    }

    return size;
}

function formatBytes(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function extraerAtributo(xml: string, tagName: string, attr: string): string {
    const regex = new RegExp(`<(?:\\w+:)?${tagName}[^>]*\\s${attr}=["']([^"']+)["']`, 'i');
    const match = xml.match(regex);
    return match?.[1] ?? '';
}

function parseXmlMetadata(xmlContenido: string) {
    return {
        fechaEmision: extraerAtributo(xmlContenido, 'Comprobante', 'Fecha'),
        total: extraerAtributo(xmlContenido, 'Comprobante', 'Total'),
        moneda: extraerAtributo(xmlContenido, 'Comprobante', 'Moneda') || 'MXN',
        efectoCfdi: extraerAtributo(xmlContenido, 'Comprobante', 'TipoDeComprobante') || 'I',
        emisorRfc: extraerAtributo(xmlContenido, 'Emisor', 'Rfc'),
        emisorNombre: extraerAtributo(xmlContenido, 'Emisor', 'Nombre') || 'PROVEEDOR DESCONOCIDO',
        receptorRfc: extraerAtributo(xmlContenido, 'Receptor', 'Rfc'),
        uuid: extraerAtributo(xmlContenido, 'TimbreFiscalDigital', 'UUID'),
    };
}

export async function GET(req: NextRequest) {
    try {
        const satSession = getSatSessionFromRequest(req);

        if (!satSession) {
            return NextResponse.json(
                { error: 'No hay una sesión SAT activa. Inicia sesión con tu .cer, .key y contraseña.' },
                { status: 401 }
            );
        }

        const pendientes = await prisma.solicitudSat.findMany({
            where: {
                estado: {
                    in: ['PENDIENTE', 'EN_PROCESO'],
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        if (pendientes.length === 0) {
            return NextResponse.json({ ok: true, mensaje: 'No hay solicitudes en proceso.' });
        }

        const almacenPath = path.join(process.cwd(), 'almacen_facturas');
        if (!fs.existsSync(almacenPath)) {
            fs.mkdirSync(almacenPath, { recursive: true });
        }

        let tamanoActual = obtenerTamanoCarpeta(almacenPath);

        if (tamanoActual >= UMBRAL_ALERTA_BYTES) {
            await prisma.solicitudSat.updateMany({
                where: {
                    id: { in: pendientes.map((p) => p.id) },
                },
                data: {
                    estado: 'RESPALDO_REQUERIDO',
                    mensajeSat: `Almacenamiento local casi lleno (${formatBytes(tamanoActual)}). Debes respaldar antes de descargar más XML.`,
                },
            });

            return NextResponse.json(
                {
                    error: `⚠️ Almacenamiento casi lleno (${formatBytes(tamanoActual)}). Haz respaldo antes de seguir descargando.`,
                },
                { status: 400 }
            );
        }

        const satService = new DescargaMasivaSAT(
            satSession.cerString,
            satSession.keyString,
            satSession.password
        );

        let nuevasFacturas = 0;

        const resumen: Record<string, number> = {
            PENDIENTE: 0,
            EN_PROCESO: 0,
            COMPLETADA: 0,
            SIN_RESULTADOS: 0,
            DUPLICADA: 0,
            RECHAZADA: 0,
            ERROR: 0,
            VENCIDA: 0,
            RESPALDO_REQUERIDO: 0,
        };

        for (const solicitud of pendientes) {
            try {
                const resultado = await satService.verificarSolicitud(solicitud.requestId);

                if (resultado.estado !== 'COMPLETADA') {
                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: {
                            estado: resultado.estado,
                            mensajeSat: resultado.mensajeSat,
                        },
                    });

                    resumen[resultado.estado] += 1;
                    continue;
                }

                let storageStop = false;

                for (const paqueteId of resultado.packageIds) {
                    tamanoActual = obtenerTamanoCarpeta(almacenPath);

                    if (tamanoActual >= UMBRAL_ALERTA_BYTES) {
                        storageStop = true;
                        break;
                    }

                    const base64Zip = await satService.descargarPaquete(paqueteId);
                    const zipBuffer = Buffer.from(base64Zip, 'base64');

                    if (tamanoActual + zipBuffer.length > LIMITE_BYTES) {
                        storageStop = true;
                        break;
                    }

                    const zip = new AdmZip(zipBuffer);
                    const zipEntries = zip.getEntries();

                    for (const entry of zipEntries) {
                        if (entry.isDirectory || !entry.entryName.toLowerCase().endsWith('.xml')) {
                            continue;
                        }

                        const xmlContenido = entry.getData().toString('utf8');
                        const bytesXml = Buffer.byteLength(xmlContenido, 'utf8');

                        tamanoActual = obtenerTamanoCarpeta(almacenPath);

                        if (tamanoActual + bytesXml > LIMITE_BYTES) {
                            storageStop = true;
                            break;
                        }

                        const meta = parseXmlMetadata(xmlContenido);

                        if (!meta.uuid || !meta.emisorRfc) {
                            continue;
                        }

                        const fechaDoc = meta.fechaEmision ? new Date(meta.fechaEmision) : new Date();

                        const anioStr = fechaDoc.getFullYear().toString();
                        const mesStr = (fechaDoc.getMonth() + 1).toString().padStart(2, '0');

                        const folderDest = path.join(almacenPath, anioStr, mesStr);
                        if (!fs.existsSync(folderDest)) {
                            fs.mkdirSync(folderDest, { recursive: true });
                        }

                        const fileName = `${meta.emisorRfc}_${meta.uuid}.xml`;
                        const filePath = path.join(folderDest, fileName);
                        const archivoEsNuevo = !fs.existsSync(filePath);

                        if (archivoEsNuevo) {
                            fs.writeFileSync(filePath, xmlContenido, 'utf8');
                            tamanoActual += bytesXml;
                            nuevasFacturas++;
                        }

                        await prisma.facturaRecibida.upsert({
                            where: { uuid: meta.uuid },
                            update: {},
                            create: {
                                uuid: meta.uuid,
                                emisorRfc: meta.emisorRfc,
                                emisorNombre: meta.emisorNombre,
                                receptorRfc: meta.receptorRfc || satSession.rfc,
                                fechaEmision: fechaDoc,
                                total: parseFloat(meta.total) || 0,
                                moneda: meta.moneda,
                                efectoCfdi: meta.efectoCfdi,
                                xmlContenido,
                                estadoSat: 'VIGENTE',
                            },
                        });
                    }

                    if (storageStop) {
                        break;
                    }
                }

                if (storageStop) {
                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: {
                            estado: 'RESPALDO_REQUERIDO',
                            mensajeSat: 'Se alcanzó el límite de almacenamiento local. Debes respaldar antes de continuar con más descargas.',
                        },
                    });

                    resumen.RESPALDO_REQUERIDO += 1;
                    continue;
                }

                await prisma.solicitudSat.update({
                    where: { id: solicitud.id },
                    data: {
                        estado: 'COMPLETADA',
                        mensajeSat: `${resultado.mensajeSat} | Paquetes descargados: ${resultado.packageIds.length}`,
                    },
                });

                resumen.COMPLETADA += 1;
            } catch (err: any) {
                const mensaje = err.message || 'Error desconocido al verificar la solicitud';
                let estado: string = 'ERROR';

                if (/duplicad|5005/i.test(mensaje)) {
                    estado = 'DUPLICADA';
                } else if (/vencid|expired|estado:\s*6/i.test(mensaje)) {
                    estado = 'VENCIDA';
                } else if (/rechazad|estado:\s*5/i.test(mensaje)) {
                    estado = 'RECHAZADA';
                }

                await prisma.solicitudSat.update({
                    where: { id: solicitud.id },
                    data: {
                        estado,
                        mensajeSat: mensaje,
                    },
                });

                resumen[estado] += 1;
            }
        }

        const partes: string[] = [];

        if (nuevasFacturas > 0) {
            partes.push(`XML nuevos guardados: ${nuevasFacturas}`);
        }

        for (const [estado, total] of Object.entries(resumen)) {
            if (total > 0) {
                partes.push(`${estado}: ${total}`);
            }
        }

        return NextResponse.json({
            ok: true,
            mensaje: partes.length > 0
                ? `Verificación terminada. ${partes.join(' | ')}`
                : '⏳ El SAT sigue procesando tus solicitudes.',
        });
    } catch (error: any) {
        console.error('Error verificando facturas:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}