import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── GET — listar todas las facturas ──────────────────────────────────────────
export async function GET() {
  try {
    const facturas = await prisma.factura.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            nombreRazonSocial: true,
            rfc: true,
          },
        },
        conceptos: true,
      },
    });
    return NextResponse.json(facturas);
  } catch (err) {
    console.error('GET /api/facturas error:', err);
    return NextResponse.json({ error: 'Error al obtener facturas' }, { status: 500 });
  }
}

// ── POST — crear factura ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validar campos obligatorios
    const required = ['clienteId', 'usoCFDI', 'formaPago', 'metodoPago', 'fecha', 'conceptos'];
    for (const k of required) {
      if (!body?.[k] || (Array.isArray(body[k]) && body[k].length === 0)) {
        return NextResponse.json(
          { error: `Falta campo obligatorio: ${k}` },
          { status: 400 }
        );
      }
    }

    // Validar regla SAT: PPD → formaPago debe ser 99
    if (body.metodoPago === 'PPD' && body.formaPago !== '99') {
      return NextResponse.json(
        { error: 'Con método de pago PPD, la forma de pago debe ser 99 (Por definir)' },
        { status: 400 }
      );
    }

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: body.clienteId },
    });
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Calcular totales desde los conceptos (no confiar en el frontend)
    let subtotal = 0;
    let totalIVA = 0;
    let totalIEPS = 0;

    const conceptosData = body.conceptos.map((c: any) => {
      const importe = parseFloat(c.cantidad) * parseFloat(c.precioUnitario) - (parseFloat(c.descuento) || 0);
      const ivaImporte = c.objetoImpuesto !== '01' ? importe * parseFloat(c.ivaTasa) : 0;
      const iepsImporte = c.objetoImpuesto !== '01' ? importe * parseFloat(c.iepsTasa || 0) : 0;

      subtotal += importe;
      totalIVA += ivaImporte;
      totalIEPS += iepsImporte;

      return {
        productId: c.productoId || null,
        claveProdServ: c.claveProdServ,
        claveUnidad: c.claveUnidad,
        unidad: c.unidad,
        descripcion: c.descripcion,
        cantidad: parseFloat(c.cantidad),
        precioUnitario: parseFloat(c.precioUnitario),
        descuento: parseFloat(c.descuento) || 0,
        importe,
        objetoImpuesto: c.objetoImpuesto || '02',
        ivaTasa: parseFloat(c.ivaTasa),
        iepsTasa: parseFloat(c.iepsTasa) || 0,
        ivaImporte,
        iepsImporte,
      };
    });

    const retencionIVA = subtotal * ((parseFloat(body.retencionIVAPct) || 0) / 100);
    const retencionISR = subtotal * ((parseFloat(body.retencionISRPct) || 0) / 100);
    const total = subtotal + totalIVA + totalIEPS - retencionIVA - retencionISR;

    // Crear factura con conceptos en una sola transacción
    const factura = await prisma.factura.create({
      data: {
        serie: body.serie || 'A',
        folio: String(body.folio),
        fecha: new Date(body.fecha),
        lugarExpedicion: client.cp,
        tipoComprobante: 'I',
        formaPago: body.formaPago,
        metodoPago: body.metodoPago,
        moneda: body.moneda || 'MXN',
        tipoCambio: parseFloat(body.tipoCambio) || 1,
        condicionesPago: body.condicionesPago || null,
        clientId: body.clienteId,
        usoCFDI: body.usoCFDI,
        subtotal,
        totalIVA,
        totalIEPS,
        retencionIVA,
        retencionISR,
        total,
        estado: 'BORRADOR',
        notas: body.notas || null,
        conceptos: {
          create: conceptosData,
        },
      },
      include: {
        conceptos: true,
        client: {
          select: { nombreRazonSocial: true, rfc: true },
        },
      },
    });

    return NextResponse.json(factura, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/facturas error:', err);

    // Serie+Folio duplicado
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe una factura con esa Serie y Folio' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Error interno al guardar' }, { status: 500 });
  }
}
