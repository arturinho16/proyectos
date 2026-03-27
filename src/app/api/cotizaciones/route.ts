import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── GET /api/cotizaciones ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    const where: any = {};
    if (clientId) where.clientId = clientId;

    const cotizaciones = await prisma.cotizacion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        conceptos: true,
      },
    });

    return NextResponse.json(cotizaciones);
  } catch (error: any) {
    console.error('❌ Error al obtener cotizaciones:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST /api/cotizaciones ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      serie = 'COT', // Por defecto usamos la serie COT
      folio,
      fecha,
      fechaVencimiento,
      moneda = 'MXN',
      tipoCambio = 1,
      condicionesPago,
      notas,
      clienteId,
      conceptos,
    } = body;

    // Calcular totales exactos (Reglas SAT aplicadas a la cotización)
    let subtotal = 0, totalIVA = 0, totalIEPS = 0, totalDescuento = 0;
    
    for (const c of conceptos) {
      // 1. El Importe es estricto: Cantidad * Precio Unitario
      const importeConcepto = Number(c.cantidad) * Number(c.precioUnitario); 
      
      // 2. La base para impuestos es Importe - Descuento
      const baseImpuesto = importeConcepto - Number(c.descuento || 0); 
      
      const iva = c.objetoImpuesto !== '01' ? baseImpuesto * Number(c.ivaTasa) : 0;
      const ieps = c.objetoImpuesto !== '01' ? baseImpuesto * Number(c.iepsTasa) : 0;
      
      subtotal += importeConcepto; 
      totalIVA += iva;
      totalIEPS += ieps;
      totalDescuento += Number(c.descuento || 0);
    }

    // Por ahora las cotizaciones no suelen llevar retenciones, pero dejamos la base lista
    const retencionIVA = 0; 
    const retencionISR = 0;
    
    const total = subtotal - totalDescuento + totalIVA + totalIEPS - retencionIVA - retencionISR;

    // Verificar que el cliente exista
    const client = await prisma.client.findUnique({ where: { id: clienteId } });
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    // Crear la cotización y sus conceptos en una sola transacción
    const cotizacion = await prisma.cotizacion.create({
      data: {
        serie,
        folio,
        fecha: new Date(fecha),
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        moneda,
        tipoCambio: Number(tipoCambio),
        condicionesPago: condicionesPago || null,
        notas: notas || null,
        clientId: clienteId,
        subtotal,
        descuento: totalDescuento,
        totalIVA,
        totalIEPS,
        retencionIVA,
        retencionISR,
        total,
        estado: 'BORRADOR', // Estado inicial
        conceptos: {
          create: conceptos.map((c: any) => {
            const importe = Number(c.cantidad) * Number(c.precioUnitario);
            const baseImp = importe - Number(c.descuento || 0);
            const ivaImporte = c.objetoImpuesto !== '01' ? baseImp * Number(c.ivaTasa) : 0;
            const iepsImporte = c.objetoImpuesto !== '01' ? baseImp * Number(c.iepsTasa) : 0;
            
            return {
              productId: c.productId || null,
              claveProdServ: c.claveProdServ,
              claveUnidad: c.claveUnidad,
              unidad: c.unidad,
              descripcion: c.descripcion,
              cantidad: Number(c.cantidad),
              precioUnitario: Number(c.precioUnitario),
              descuento: Number(c.descuento || 0),
              importe, 
              objetoImpuesto: c.objetoImpuesto,
              ivaTasa: Number(c.ivaTasa),
              iepsTasa: Number(c.iepsTasa || 0),
              ivaImporte,
              iepsImporte,
            };
          }),
        },
      },
    });

    return NextResponse.json(cotizacion, { status: 201 });
  } catch (err: any) {
    console.error('❌ Error al crear cotización:', err);
    if (err.code === 'P2002') return NextResponse.json({ error: 'Ya existe una cotización con esa serie y folio' }, { status: 409 });
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
