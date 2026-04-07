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
      esGlobal, periodicidad, mes, anio, cotizacionId // <-- Añadido soporte para cotizaciones
    } = body;

    const lugarExpedicionFinal = emisorCp || process.env.EMISOR_CP || '42000';

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
      clienteId = clienteGlobal.id;
    }

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

    // ── MAGIA: BUSCAR SI EL BORRADOR YA EXISTE ──
    const facturaExistente = await prisma.factura.findFirst({
      where: { serie: serie, folio: String(folio) },
    });

    let factura;

    const conceptosFormateados = conceptos.map((c: any) => {
      const importe = c.cantidad * c.precioUnitario;
      const baseImp = importe - (c.descuento || 0);
      const ivaImporte = c.objetoImpuesto !== '01' ? baseImp * c.ivaTasa : 0;
      const iepsImporte = c.objetoImpuesto !== '01' ? baseImp * c.iepsTasa : 0;

      return {
        productId: c.productId || null,
        claveProdServ: c.claveProdServ,
        noIdentificacion: c.noIdentificacion || null,
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
    });

    if (facturaExistente) {
      // Si la factura ya se timbró en el SAT, bloqueamos cambios
      if (facturaExistente.estado !== 'BORRADOR') {
        return NextResponse.json({ error: 'Ya existe una factura TIMBRADA o CANCELADA con esa serie y folio' }, { status: 409 });
      }

      // 1. Borramos los conceptos viejos de la base de datos
      await prisma.conceptoFactura.deleteMany({
        where: { facturaId: facturaExistente.id },
      });

      // 2. Actualizamos la misma factura con los nuevos datos y nuevos ítems
      factura = await prisma.factura.update({
        where: { id: facturaExistente.id },
        data: {
          fecha: new Date(fecha),
          lugarExpedicion: lugarExpedicionFinal,
          formaPago,
          metodoPago,
          moneda,
          tipoCambio,
          condicionesPago: condicionesPago || null,
          notas: notas || null,
          clientId: clienteId,
          cotizacionId: cotizacionId || null,
          usoCFDI,
          subtotal,
          descuento: totalDescuento,
          totalIVA,
          totalIEPS,
          retencionIVA,
          retencionISR,
          total,
          esGlobal: esGlobal || false,
          periodicidad: periodicidad || null,
          mes: mes || null,
          anio: anio ? Number(anio) : null,
          conceptos: {
            create: conceptosFormateados, // Metemos los nuevos ítems
          },
        },
        include: {
          client: true,
          conceptos: true,
        }
      });
    } else {
      // Si no existe (es la primera vez que le das a "Revisar"), la creamos normal
      factura = await prisma.factura.create({
        data: {
          serie,
          folio: String(folio),
          fecha: new Date(fecha),
          lugarExpedicion: lugarExpedicionFinal,
          formaPago,
          metodoPago,
          moneda,
          tipoCambio,
          condicionesPago: condicionesPago || null,
          notas: notas || null,
          clientId: clienteId,
          cotizacionId: cotizacionId || null,
          usoCFDI,
          subtotal,
          descuento: totalDescuento,
          totalIVA,
          totalIEPS,
          retencionIVA,
          retencionISR,
          total,
          estado: 'BORRADOR',
          esGlobal: esGlobal || false,
          periodicidad: periodicidad || null,
          mes: mes || null,
          anio: anio ? Number(anio) : null,
          conceptos: {
            create: conceptosFormateados,
          },
        },
        include: {
          client: true,
          conceptos: true,
        }
      });
    }

    return NextResponse.json(factura, { status: 201 });
  } catch (err: any) {
    console.error('❌ Error al crear/actualizar factura:', err);
    if (err.code === 'P2002') return NextResponse.json({ error: 'Ya existe una factura con esa serie y folio' }, { status: 409 });
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}