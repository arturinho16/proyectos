import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generarXMLNomina } from '@/lib/sat/timbrarNomina';
import { timbrarFactura } from '@/lib/sat/timbrar'; // Aprovechando tu lógica de Finkok
import { getNoCertificado, getCertificadoBase64 } from '@/lib/sat/firmar';

export async function POST(req: Request) {
    try {
        const { recibosIds } = await req.json(); // Array de IDs de ReciboNomina a timbrar

        const recibos = await prisma.reciboNomina.findMany({
            where: { id: { in: recibosIds }, estado: 'BORRADOR' },
            include: { empleado: true }
        });

        const cerB64 = process.env.CSD_CERTIFICADO_B64!;
        const noCertificado = getNoCertificado(cerB64);
        const certificadoB64 = getCertificadoBase64(cerB64);

        const resultados = [];

        for (const recibo of recibos) {
            try {
                // 1. Generar XML
                const xmlUnsigned = generarXMLNomina(recibo, recibo.empleado, noCertificado, certificadoB64);

                // 2. Firmar y Timbrar (Ajusta la función timbrarFactura para aceptar el XML crudo o envuélvelo)
                // const { uuid, xmlTimbrado } = await timbrarConFinkok(xmlUnsigned); 

                // SIMULACIÓN (Aquí llamas a tu función de Finkok real)
                const uuid = `MOCK-UUID-${recibo.id}`;
                const xmlTimbrado = `<xml>...</xml>`;

                // 3. Guardar en Base de Datos
                await prisma.reciboNomina.update({
                    where: { id: recibo.id },
                    data: {
                        estado: 'TIMBRADO',
                        uuid: uuid,
                        xmlTimbrado: xmlTimbrado
                    }
                });

                resultados.push({ empleado: recibo.empleado.numEmpleado, status: 'Exito', uuid });
            } catch (error: any) {
                await prisma.reciboNomina.update({
                    where: { id: recibo.id },
                    data: { estado: 'ERROR', mensajeError: error.message }
                });
                resultados.push({ empleado: recibo.empleado.numEmpleado, status: 'Error', mensaje: error.message });
            }
        }

        return NextResponse.json({ message: 'Proceso de timbrado finalizado', resultados });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}