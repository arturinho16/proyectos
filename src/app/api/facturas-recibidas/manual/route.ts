import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { xmlContenido } = body;

        if (!xmlContenido) {
            return NextResponse.json({ error: 'No se envió el XML.' }, { status: 400 });
        }

        // Extraer datos clave usando Regex
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

        if (!uuid || !emisorRfc) {
            return NextResponse.json({ error: 'XML inválido. No se encontró UUID o RFC del Emisor.' }, { status: 400 });
        }

        // Guardado físico en la estructura de carpetas
        const fechaDoc = new Date(fechaEmision);
        const anioStr = fechaDoc.getFullYear().toString();
        const mesStr = (fechaDoc.getMonth() + 1).toString().padStart(2, '0');

        const almacenPath = path.join(process.cwd(), 'almacen_facturas');
        const folderDest = path.join(almacenPath, anioStr, mesStr);

        if (!fs.existsSync(folderDest)) {
            fs.mkdirSync(folderDest, { recursive: true });
        }

        const fileName = `${emisorRfc}_${uuid}.xml`;
        const filePath = path.join(folderDest, fileName);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, xmlContenido, 'utf8');
        }

        // Guardado en Base de Datos
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
                xmlContenido,
                estadoSat: 'VIGENTE'
            }
        });

        return NextResponse.json({ ok: true, mensaje: `Factura procesada y guardada con éxito.` });

    } catch (error: any) {
        console.error("Error al subir XML manual:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}