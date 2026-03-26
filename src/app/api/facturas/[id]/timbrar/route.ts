import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { timbrarFactura } from '@/lib/sat/timbrar';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Buscamos la factura de base de datos
    const factura = await prisma.factura.findUnique({
      where: { id },
      include: { client: true, conceptos: true },
    });

    if (!factura) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    if (factura.estado === 'TIMBRADO') return NextResponse.json({ error: 'Factura ya timbrada' }, { status: 400 });

    // 2. Mapeamos la factura al formato que espera nuestro motor de timbrado (DatosFactura)
    const datosParaTimbrar: any = {
      ...factura,
      subtotal: Number(factura.subtotal),
      descuento: Number(factura.descuento),
      totalIVA: Number(factura.totalIVA),
      totalIEPS: Number(factura.totalIEPS),
      retencionIVA: Number(factura.retencionIVA),
      retencionISR: Number(factura.retencionISR),
      total: Number(factura.total),
      tipoCambio: Number(factura.tipoCambio),
      conceptos: factura.conceptos.map(c => ({
        ...c,
        cantidad: Number(c.cantidad),
        precioUnitario: Number(c.precioUnitario),
        descuento: Number(c.descuento),
        importe: Number(c.importe),
        ivaTasa: Number(c.ivaTasa),
        iepsTasa: Number(c.iepsTasa),
        ivaImporte: Number(c.ivaImporte),
        iepsImporte: Number(c.iepsImporte),
      })),
      client: {
        rfc: factura.client.rfc,
        nombreRazonSocial: factura.client.nombreRazonSocial,
        regimenFiscal: factura.client.regimenFiscal,
        cp: factura.client.cp,
      }
    };

    // 3. Llamamos al servicio único central
    const resultado = await timbrarFactura(datosParaTimbrar);

    // 4. Actualizamos la base de datos con el UUID y guardamos el XML timbrado
    await prisma.factura.update({
      where: { id },
      data: {
        estado: 'TIMBRADO',
        uuid: resultado.uuid,
        xmlTimbrado: resultado.xmlTimbrado,
      }
    });

    return NextResponse.json({ success: true, uuid: resultado.uuid });

  } catch (e: any) {
    console.error('❌ Error general de timbrado:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 422 });
  }
}