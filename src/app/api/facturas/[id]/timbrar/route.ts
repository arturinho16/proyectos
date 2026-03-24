import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { timbrarFactura } from '@/lib/sat/timbrar';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Obtener la factura completa de la BD
    const factura = await prisma.factura.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            rfc: true,
            nombreRazonSocial: true,
            regimenFiscal: true,
            cp: true,
            usoCfdiDefault: true,
          },
        },
        conceptos: true,
      },
    });

    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    if (factura.estado !== 'BORRADOR') {
      return NextResponse.json(
        { error: `La factura ya está en estado: ${factura.estado}` },
        { status: 400 }
      );
    }

    // 2. Preparar datos para el timbrado
    const datos = {
      serie: factura.serie,
      folio: factura.folio,
      fecha: factura.fecha,
      lugarExpedicion: factura.lugarExpedicion,
      formaPago: factura.formaPago,
      metodoPago: factura.metodoPago,
      moneda: factura.moneda,
      tipoCambio: Number(factura.tipoCambio),
      condicionesPago: factura.condicionesPago,
      tipoComprobante: factura.tipoComprobante,
      subtotal: Number(factura.subtotal),
      descuento: Number(factura.descuento),
      totalIVA: Number(factura.totalIVA),
      totalIEPS: Number(factura.totalIEPS),
      retencionIVA: Number(factura.retencionIVA),
      retencionISR: Number(factura.retencionISR),
      total: Number(factura.total),
      usoCFDI: factura.usoCFDI,
      client: factura.client,
      conceptos: factura.conceptos.map((c) => ({
        claveProdServ: c.claveProdServ,
        claveUnidad: c.claveUnidad,
        unidad: c.unidad,
        descripcion: c.descripcion,
        cantidad: Number(c.cantidad),
        precioUnitario: Number(c.precioUnitario),
        descuento: Number(c.descuento),
        importe: Number(c.importe),
        objetoImpuesto: c.objetoImpuesto,
        ivaTasa: Number(c.ivaTasa),
        iepsTasa: Number(c.iepsTasa),
        ivaImporte: Number(c.ivaImporte),
        iepsImporte: Number(c.iepsImporte),
      })),
    };

    // 3. Timbrar con FINKOK
    console.log(`🔄 Timbrando factura ${factura.serie}${factura.folio}...`);
    const { uuid, xmlTimbrado } = await timbrarFactura(datos);
    console.log(`✅ Timbrado exitoso. UUID: ${uuid}`);

    // 4. Actualizar la factura en Base de Datos
    const facturaActualizada = await prisma.factura.update({
      where: { id },
      data: {
        estado: 'TIMBRADO',
        uuid,
        xmlTimbrado,
      },
    });

    return NextResponse.json({
      ok: true,
      uuid,
      estado: facturaActualizada.estado,
      mensaje: `Factura timbrada exitosamente. UUID: ${uuid}`,
    });

  } catch (err: any) {
    console.error('❌ Error al timbrar:', err.message);
    return NextResponse.json(
      { error: err.message || 'Error interno al timbrar' },
      { status: 500 }
    );
  }
}
