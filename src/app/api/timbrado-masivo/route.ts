import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generarXMLNomina } from '@/lib/sat/timbrarNomina';
import { buildCadenaOriginal } from '@/lib/sat/timbrar';
import { getNoCertificado, getCertificadoBase64, keyToPem, generarSello } from '@/lib/sat/firmar';
import * as soap from 'soap';

const WSDL_DEMO = 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';
const WSDL_PROD = 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl';

export async function POST(req: Request) {
    try {
        const { recibosIds } = await req.json();

        // 1. Obtener recibos con TODO su detalle (Relaciones de Prisma)
        const recibos = await prisma.reciboNomina.findMany({
            where: { id: { in: recibosIds }, estado: 'BORRADOR' },
            include: {
                empleado: true,
                percepciones: true,
                deducciones: true
            }
        });

        if (recibos.length === 0) {
            return NextResponse.json({ message: 'No hay recibos válidos en estado BORRADOR.' }, { status: 400 });
        }

        // 2. Extraer CSD de las variables de entorno
        const cerB64 = process.env.CSD_CERTIFICADO_B64!;
        const keyB64 = process.env.CSD_LLAVE_B64!;
        const passwordCSD = process.env.CSD_PASSWORD!;

        const noCertificado = getNoCertificado(cerB64);
        const certificadoB64 = getCertificadoBase64(cerB64);
        const keyPem = keyToPem(keyB64, passwordCSD);

        // 3. Configuración de Finkok
        const usuarioFinkok = process.env.FINKOK_USER || process.env.FINKOK_USUARIO!;
        const passwordFinkok = process.env.FINKOK_PASSWORD!;
        const ambiente = process.env.FINKOK_AMBIENTE || 'demo';
        const wsdl = ambiente === 'demo' ? WSDL_DEMO : WSDL_PROD;

        // 🔥 OPTIMIZACIÓN: Creamos el cliente SOAP una sola vez para toda la tanda
        const client = await soap.createClientAsync(wsdl);

        const resultados = [];

        // 4. Iterar sobre cada recibo para firmar y timbrar
        for (const recibo of recibos) {
            try {
                // A) Generar el XML crudo con el Placeholder
                const xmlUnsigned = generarXMLNomina(recibo, recibo.empleado, noCertificado, certificadoB64);

                // B) Generar Cadena Original y Sello Criptográfico
                const cadenaOriginal = await buildCadenaOriginal(xmlUnsigned);
                const sello = generarSello(cadenaOriginal, keyPem);

                // C) Inyectar el sello real reemplazando el placeholder
                const xmlFirmado = xmlUnsigned.replace('___SELLO_AQUI___', sello);

                // 👇 RADIOGRAFÍA COMPLETA EN CONSOLA 👇
                console.log(`\n========== EMPLEADO: ${recibo.empleado.nombre} ==========`);
                console.log(`\n[1] CADENA ORIGINAL:\n${cadenaOriginal}`);
                console.log(`\n[2] SELLO GENERADO:\n${sello}`);
                console.log(`\n[3] XML FINAL A FINKOK:\n${xmlFirmado}`);
                console.log(`=====================================================\n`);

                // D) Petición a Finkok
                const xmlBase64 = Buffer.from(xmlFirmado, 'utf-8').toString('base64');
                const [result] = await client.stampAsync({
                    xml: xmlBase64,
                    username: usuarioFinkok,
                    password: passwordFinkok
                });

                const stampResult = result?.stampResult;

                // E) Manejo estricto de errores del SAT / Finkok
                if (!stampResult || !stampResult.UUID) {
                    const incidencias = stampResult?.Incidencias?.Incidencia;
                    const incidencia = Array.isArray(incidencias) ? incidencias[0] : incidencias;
                    throw new Error(`Rechazo Finkok/SAT: ${incidencia?.MensajeIncidencia || stampResult?.CodEstatus || 'Error desconocido'}`);
                }

                // F) Limpieza del XML de retorno (Finkok a veces devuelve Base64 o caracteres invisibles BOM)
                let xmlFinal = stampResult.xml;
                if (Buffer.isBuffer(xmlFinal)) xmlFinal = xmlFinal.toString('utf-8');
                else if (typeof xmlFinal !== 'string') xmlFinal = String(xmlFinal);

                if (!xmlFinal.includes('cfdi:Comprobante')) {
                    const decodificado = Buffer.from(xmlFinal, 'base64').toString('utf-8');
                    if (decodificado.includes('cfdi:Comprobante')) xmlFinal = decodificado;
                }
                xmlFinal = xmlFinal.replace(/^\uFEFF/, '').trim();

                // G) Persistencia en Base de Datos (ÉXITO)
                await prisma.reciboNomina.update({
                    where: { id: recibo.id },
                    data: {
                        estado: 'TIMBRADO',
                        uuid: stampResult.UUID,
                        xmlTimbrado: xmlFinal,
                        mensajeError: null // Limpiamos errores previos si los hubo
                    }
                });

                resultados.push({
                    empleado: recibo.empleado.numEmpleado,
                    nombre: `${recibo.empleado.nombre} ${recibo.empleado.apellidoPaterno}`,
                    status: 'Exito',
                    uuid: stampResult.UUID
                });

            } catch (error: any) {
                // H) Persistencia de Errores (Evita que un recibo malo tire toda la nómina)
                await prisma.reciboNomina.update({
                    where: { id: recibo.id },
                    data: {
                        estado: 'ERROR',
                        mensajeError: error.message
                    }
                });

                resultados.push({
                    empleado: recibo.empleado.numEmpleado,
                    nombre: recibo.empleado.nombre,
                    status: 'Error',
                    mensaje: error.message
                });
            }
        }

        return NextResponse.json({ message: 'Proceso de timbrado finalizado', resultados });

    } catch (error: any) {
        console.error("Error crítico en controlador de timbrado masivo:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}