import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { timbrarFactura, DatosFactura } from '@/lib/sat/timbrar';

// 1. En Next.js 15+, params es una Promesa que contiene los parámetros
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 2. OBLIGATORIO: Esperar (await) a que los parámetros se resuelvan
    const { id } = await params;

    const factura = await prisma.factura.findUnique({
      where: { id }, // Ahora sí, el id tiene un valor real
      include: { client: true, conceptos: true },
    });

    if (!factura) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    if (factura.estado === 'TIMBRADO') return NextResponse.json({ error: 'La factura ya está timbrada' }, { status: 400 });

    // ── MAPEO EXACTO PARA EL MOTOR DE TIMBRADO ──
    const datosParaTimbrar: DatosFactura = {
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
      client: {
        rfc: factura.client.rfc,
        nombreRazonSocial: factura.client.nombreRazonSocial,
        regimenFiscal: factura.client.regimenFiscal,
        cp: factura.client.cp,
      },
      // ── CAMPOS GLOBALES AÑADIDOS ──
      esGlobal: factura.esGlobal,
      periodicidad: factura.periodicidad || undefined,
      mes: factura.mes || undefined,
      anio: factura.anio || undefined,

      conceptos: factura.conceptos.map(c => ({
        // ── NO. IDENTIFICACIÓN DE LOS TICKETS ──
        noIdentificacion: c.noIdentificacion || undefined,
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

    const resultado = await timbrarFactura(datosParaTimbrar);

    await prisma.factura.update({
      where: { id: factura.id },
      data: {
        estado: 'TIMBRADO',
        uuid: resultado.uuid,
        xmlTimbrado: resultado.xmlTimbrado,
      },
    });

    return NextResponse.json({ ok: true, uuid: resultado.uuid });
  } catch (error: any) {
    console.error("Error en ruta timbrar:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}