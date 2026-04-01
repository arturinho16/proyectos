import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── GET /api/facturas ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const estado = searchParams.get('estado');
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');
  const q = searchParams.get('q');

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
      client: true,
      conceptos: true,
    },
  });

  return NextResponse.json(facturas);
}

// ─── POST /api/facturas ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let {
      serie, folio, fecha, formaPago, metodoPago, moneda, tipoCambio,
      condicionesPago, notas, clienteId, usoCFDI,
      retencionIVAPct, retencionISRPct, conceptos, emisorCp,
      // Nuevos campos para Factura Global
      esGlobal, periodicidad, mes, anio
    } = body;

    const lugarExpedicionFinal = emisorCp || process.env.EMISOR_CP || '42000';

    // ── MAGIA GLOBAL: Crear o buscar al cliente "PUBLICO EN GENERAL" ──
    if (esGlobal) {
      let clienteGlobal = await prisma.client.findFirst({
        where: { rfc: 'XAXX010101000' }
      });

      if (!clienteGlobal) {
        clienteGlobal = await prisma.client.create({
          data: {
            rfc: 'XAXX010101000',
            nombreRazonSocial: 'PUBLICO EN GENERAL',
            regimenFiscal: '616',
            cp: lugarExpedicionFinal,
            usoCfdiDefault: 'S01'
          }
        });
      }
      clienteId = clienteGlobal.id; // Interceptamos y sobrescribimos el ID
    }

    // Calcular totales según Anexo 20 del SAT
    let subtotal = 0, totalIVA = 0, totalIEPS = 0, totalDescuento = 0;

    for (const c of conceptos) {
      const importeConcepto = c.cantidad * c.precioUnitario;
      const baseImpuesto = importeConcepto - (c.descuento || 0);

      const iva = c.objetoImpuesto !== '01' ? baseImpuesto * c.ivaTasa : 0;
      const ieps = c.objetoImpuesto !== '01' ? baseImpuesto * c.iepsTasa : 0;

      subtotal += importeConcepto;
      totalIVA += iva;
      totalIEPS += ieps;
      totalDescuento += c.descuento || 0;
    }

    const baseRetenciones = subtotal - totalDescuento;
    const retencionIVA = baseRetenciones * ((retencionIVAPct || 0) / 100);
    const retencionISR = baseRetenciones * ((retencionISRPct || 0) / 100);
    const total = subtotal - totalDescuento + totalIVA + totalIEPS - retencionIVA - retencionISR;

    const client = await prisma.client.findUnique({ where: { id: clienteId } });
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const factura = await prisma.factura.create({
      data: {
        serie,
        folio,
        fecha: new Date(fecha),
        lugarExpedicion: lugarExpedicionFinal,
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

        // Asignación de datos Globales SAT
        esGlobal: esGlobal || false,
        periodicidad: periodicidad || null,
        mes: mes || null,
        anio: anio ? Number(anio) : null,

        conceptos: {
          create: conceptos.map((c: any) => {
            const importe = c.cantidad * c.precioUnitario;
            const baseImp = importe - (c.descuento || 0);
            const ivaImporte = c.objetoImpuesto !== '01' ? baseImp * c.ivaTasa : 0;
            const iepsImporte = c.objetoImpuesto !== '01' ? baseImp * c.iepsTasa : 0;

            return {
              productId: c.productId || null,
              claveProdServ: c.claveProdServ,
              noIdentificacion: c.noIdentificacion || null, // Se guarda el folio del ticket
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
    if (err.code === 'P2002') return NextResponse.json({ error: 'Ya existe una factura con esa serie y folio' }, { status: 409 });
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}