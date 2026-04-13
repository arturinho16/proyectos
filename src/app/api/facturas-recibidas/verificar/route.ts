import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

// Función auxiliar para calcular el tamaño de la carpeta en Bytes
function obtenerTamanoCarpeta(dirPath: string): number {
    let size = 0;
    if (fs.existsSync(dirPath)) {
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
    }
    return size;
}

export async function GET(req: NextRequest) {
    try {
        const pendientes = await prisma.solicitudSat.findMany({
            where: { estado: 'PENDIENTE' }
        });

        if (pendientes.length === 0) {
            return NextResponse.json({ ok: true, mensaje: 'No hay solicitudes en proceso.' });
        }

        // 1. Verificar Espacio en Disco (Límite 2GB, avisamos al llegar a 1.9GB)
        const almacenPath = path.join(process.cwd(), 'almacen_facturas');
        const MAX_BYTES = 1.9 * 1024 * 1024 * 1024; // 1.9 GB en bytes

        const tamanoActual = obtenerTamanoCarpeta(almacenPath);
        if (tamanoActual > MAX_BYTES) {
            return NextResponse.json({
                error: '⚠️ Almacenamiento casi lleno (Capacidad: 2.0 GB). Por favor, respalda tus facturas mensuales, limpia la carpeta y vuelve a intentar.'
            }, { status: 400 });
        }

        // 2. Credenciales FIEL
        const cerPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/como891216cm1.cer');
        const keyPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/Claveprivada_FIEL_COMO891216CM1_20260219_140155.key');
        const passwordFiel = 'MONROY1612'; // ⚠️ PON TU CONTRASEÑA

        const cerString = fs.readFileSync(cerPath, 'binary');
        const keyString = fs.readFileSync(keyPath, 'binary');
        const satService = new DescargaMasivaSAT(cerString, keyString, passwordFiel);

        let procesadas = 0;
        let nuevasFacturas = 0;
        let rechazadas = 0;

        for (const solicitud of pendientes) {
            try {
                const paquetes = await satService.verificarSolicitud(solicitud.requestId);

                if (paquetes.length > 0) {
                    for (const paqueteId of paquetes) {
                        const base64Zip = await satService.descargarPaquete(paqueteId);
                        const zipBuffer = Buffer.from(base64Zip, 'base64');
                        const zip = new AdmZip(zipBuffer);
                        const zipEntries = zip.getEntries();

                        for (const entry of zipEntries) {
                            if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.xml')) {
                                const xmlContenido = entry.getData().toString('utf8');

                                const getComprobanteAttr = (attr: string) => {
                                    const match = xmlContenido.match(new RegExp(`<cfdi:Comprobante[^>]+${attr}=["']([^"']+)["']`, 'i'));
                                    return match ? match[1] : '';
                                };

                                const fechaEmision = getComprobanteAttr('Fecha');
                                const total = getComprobanteAttr('Total');
                                const moneda = getComprobanteAttr('Moneda') || 'MXN';
                                const efectoCfdi = getComprobanteAttr('TipoDeComprobante') || 'I';

                                const emisorMatch = xmlContenido.match(/<cfdi:Emisor([^>]+)>/i);
                                let emisorRfc = '', emisorNombre = 'PROVEEDOR DESCONOCIDO';
                                if (emisorMatch) {
                                    const rfcM = emisorMatch[1].match(/Rfc=["']([^"']+)["']/i);
                                    const nomM = emisorMatch[1].match(/Nombre=["']([^"']+)["']/i);
                                    if (rfcM) emisorRfc = rfcM[1];
                                    if (nomM) emisorNombre = nomM[1];
                                }

                                const timbreMatch = xmlContenido.match(/<tfd:TimbreFiscalDigital([^>]+)>/i);
                                let uuid = '';
                                if (timbreMatch) {
                                    const uuidM = timbreMatch[1].match(/UUID=["']([^"']+)["']/i);
                                    if (uuidM) uuid = uuidM[1];
                                }

                                if (uuid && emisorRfc) {
                                    // 3. GUARDADO FÍSICO DEL XML
                                    const fechaDoc = new Date(fechaEmision);
                                    const anioStr = fechaDoc.getFullYear().toString();
                                    const mesStr = (fechaDoc.getMonth() + 1).toString().padStart(2, '0');

                                    // Crear carpeta ej. almacen_facturas/2026/03/
                                    const folderDest = path.join(almacenPath, anioStr, mesStr);
                                    if (!fs.existsSync(folderDest)) {
                                        fs.mkdirSync(folderDest, { recursive: true });
                                    }

                                    // Escribir el archivo
                                    const fileName = `${emisorRfc}_${uuid}.xml`;
                                    const filePath = path.join(folderDest, fileName);
                                    if (!fs.existsSync(filePath)) {
                                        fs.writeFileSync(filePath, xmlContenido, 'utf8');
                                    }

                                    // 4. GUARDADO EN BASE DE DATOS
                                    await prisma.facturaRecibida.upsert({
                                        where: { uuid },
                                        update: {},
                                        create: {
                                            uuid,
                                            emisorRfc,
                                            emisorNombre,
                                            receptorRfc: 'COMO891216CM1',
                                            fechaEmision: fechaDoc,
                                            total: parseFloat(total) || 0,
                                            moneda,
                                            efectoCfdi,
                                            xmlContenido, // Opcional: Podrías dejar de guardarlo aquí para ahorrar BD ya que lo tienes físico
                                            estadoSat: 'VIGENTE'
                                        }
                                    });
                                    nuevasFacturas++;
                                }
                            }
                        }
                    }

                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: { estado: 'COMPLETADA' }
                    });
                    procesadas++;
                }
            } catch (err: any) {
                if (err.message.includes('Estado: 5') || err.message.includes('Rechazada')) {
                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: { estado: 'RECHAZADA', mensajeSat: 'El SAT no devolvió facturas (No hay compras o solicitud duplicada).' }
                    });
                    rechazadas++;
                } else {
                    throw err;
                }
            }
        }

        if (procesadas > 0 || rechazadas > 0) {
            const mensajeFinal = nuevasFacturas > 0
                ? `¡Se descargaron y guardaron físicamente ${nuevasFacturas} facturas XML nuevas!`
                : `Proceso terminado. El SAT no devolvió facturas (No hay compras en este periodo o la solicitud se duplicó hoy).`;

            return NextResponse.json({ ok: true, mensaje: mensajeFinal });
        } else {
            return NextResponse.json({ ok: true, mensaje: '⏳ El SAT sigue armando tu archivo ZIP. Vuelve a intentar en unos minutos.' });
        }

    } catch (error: any) {
        console.error("Error verificando facturas:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}