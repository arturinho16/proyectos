import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── GET /api/facturas ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const estado = searchParams.get('estado');
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');
  const q = searchParams.get('q'); // búsqueda por serie/folio

  const where: any = {};
  if (clientId) where.clientId = clientId;
  if (estado) where.estado = estado;
  if (q) where.OR = [
    { serie: { contains: q, mode: 'insensitive' } },
    { folio: { contains: q, mode: 'insensitive' } },
  ];
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta);
  }

  const facturas = await prisma.factura.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { nombreRazonSocial: true, rfc: true } },
      conceptos: { select: { descripcion: true, cantidad: true, importe: true } },
    },
  });

  return NextResponse.json(facturas);
}

// ─── POST /api/facturas ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      serie, folio, fecha, formaPago, metodoPago, moneda, tipoCambio,
      condicionesPago, notas, clienteId, usoCFDI,
      retencionIVAPct, retencionISRPct, conceptos,
    } = body;

    // Calcular totales
    let subtotal = 0, totalIVA = 0, totalIEPS = 0, totalDescuento = 0;
    for (const c of conceptos) {
      const importe = c.cantidad * c.precioUnitario - (c.descuento || 0);
      const iva = c.objetoImpuesto !== '01' ? importe * c.ivaTasa : 0;
      const ieps = c.objetoImpuesto !== '01' ? importe * c.iepsTasa : 0;
      subtotal += importe;
      totalIVA += iva;
      totalIEPS += ieps;
      totalDescuento += c.descuento || 0;
    }
    const retencionIVA = subtotal * ((retencionIVAPct || 0) / 100);
    const retencionISR = subtotal * ((retencionISRPct || 0) / 100);
    const total = subtotal + totalIVA + totalIEPS - retencionIVA - retencionISR;

    // Obtener CP del emisor (lugarExpedicion) — usar CP del cliente como fallback
    const client = await prisma.client.findUnique({ where: { id: clienteId } });
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const factura = await prisma.factura.create({
      data: {
        serie,
        folio,
        fecha: new Date(fecha),
        lugarExpedicion: client.cp,
        formaPago,
        metodoPago,
        moneda,
        tipoCambio,
        condicionesPago: condicionesPago || null,
        notas: notas || null,
        clientId: clienteId,
        usoCFDI,
        subtotal,
        descuento: totalDescuento,
        totalIVA,
        totalIEPS,
        retencionIVA,
        retencionISR,
        total,
        estado: 'BORRADOR',
        conceptos: {
          create: conceptos.map((c: any) => {
            const importe = c.cantidad * c.precioUnitario - (c.descuento || 0);
            const ivaImporte = c.objetoImpuesto !== '01' ? importe * c.ivaTasa : 0;
            const iepsImporte = c.objetoImpuesto !== '01' ? importe * c.iepsTasa : 0;
            return {
              productId: c.productoId || null,
              claveProdServ: c.claveProdServ,
              claveUnidad: c.claveUnidad,
              unidad: c.unidad,
              descripcion: c.descripcion,
              cantidad: c.cantidad,
              precioUnitario: c.precioUnitario,
              descuento: c.descuento || 0,
              importe,
              objetoImpuesto: c.objetoImpuesto,
              ivaTasa: c.ivaTasa,
              iepsTasa: c.iepsTasa || 0,
              ivaImporte,
              iepsImporte,
            };
          }),
        },
      },
    });

    return NextResponse.json(factura, { status: 201 });
  } catch (err: any) {
    console.error('❌ Error al crear factura:', err);
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una factura con esa serie y folio' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}