import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export async function GET(req: NextRequest) {
    try {
        const pendientes = await prisma.solicitudSat.findMany({
            where: { estado: 'PENDIENTE' }
        });

        if (pendientes.length === 0) {
            return NextResponse.json({ ok: true, mensaje: 'No hay solicitudes en proceso. Dale a Sincronizar SAT para iniciar una.' });
        }

        const cerPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/como891216cm1.cer');
        const keyPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/Claveprivada_FIEL_COMO891216CM1_20260219_140155.key');
        const passwordFiel = 'MONROY1612'; // OJO AQUI VA TU CONTRASENA DE LA FIEL, ASEGURATE DE PROTEGERLA BIEN EN UN ENTORNO REAL (ej. variables de entorno, vault, etc.)

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
                                    await prisma.facturaRecibida.upsert({
                                        where: { uuid },
                                        update: {},
                                        create: {
                                            uuid,
                                            emisorRfc,
                                            emisorNombre,
                                            receptorRfc: 'COMO891216CM1',
                                            fechaEmision: new Date(fechaEmision),
                                            total: parseFloat(total) || 0,
                                            moneda,
                                            efectoCfdi,
                                            xmlContenido,
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
                // AQUÍ ESTÁ LA MAGIA: Si el SAT nos devuelve Estado 5 (Rechazada), lo manejamos pacíficamente.
                if (err.message.includes('Estado: 5') || err.message.includes('Rechazada')) {
                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: { estado: 'RECHAZADA', mensajeSat: 'El SAT rechazó la solicitud (Posiblemente no hay facturas en esas fechas).' }
                    });
                    rechazadas++;
                } else {
                    // Si es un error distinto (ej. no hay internet), sí lo lanzamos
                    throw err;
                }
            }
        }

        if (procesadas > 0 || rechazadas > 0) {
            const mensajeFinal = nuevasFacturas > 0
                ? `¡Se descargaron ${nuevasFacturas} facturas recibidas nuevas del SAT!`
                : `Proceso terminado. No se encontraron facturas nuevas en los últimos 5 días.`;

            return NextResponse.json({ ok: true, mensaje: mensajeFinal });
        } else {
            return NextResponse.json({ ok: true, mensaje: '⏳ El SAT sigue armando tu archivo ZIP. Vuelve a intentar en 2 minutos.' });
        }

    } catch (error: any) {
        console.error("Error verificando facturas:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}