import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── LECTURA PARA AUTO-LLENAR FACTURA Y EDITAR ─────────────────────────────
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        client: true,
        conceptos: true,
      },
    });

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    return NextResponse.json(cotizacion);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error al obtener la cotización' },
      { status: 500 }
    );
  }
}

// ─── ELIMINAR COTIZACIÓN ───────────────────────────────────────────────────
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    await prisma.cotizacion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'No se pudo eliminar la cotización' },
      { status: 500 }
    );
  }
}

// ─── EDITAR / ACTUALIZAR COTIZACIÓN (NUEVO) ────────────────────────────────
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();

    // Recalcular totales exactos para evitar inconsistencias
    let subtotal = 0, totalIVA = 0, totalIEPS = 0, totalDescuento = 0;

    for (const c of body.conceptos) {
      const importeConcepto = Number(c.cantidad) * Number(c.precioUnitario);
      const baseImpuesto = importeConcepto - Number(c.descuento || 0);

      const iva = c.objetoImpuesto !== '01' ? baseImpuesto * Number(c.ivaTasa) : 0;
      const ieps = c.objetoImpuesto !== '01' ? baseImpuesto * Number(c.iepsTasa) : 0;

      subtotal += importeConcepto;
      totalIVA += iva;
      totalIEPS += ieps;
      totalDescuento += Number(c.descuento || 0);
    }

    const total = subtotal - totalDescuento + totalIVA + totalIEPS;

    // Actualizar usando transacción: 
    // 1. Borramos los conceptos viejos.
    // 2. Actualizamos la cabecera y creamos los conceptos nuevos.
    const result = await prisma.$transaction(async (tx) => {
      await tx.conceptoCotizacion.deleteMany({ where: { cotizacionId: id } });

      return tx.cotizacion.update({
        where: { id },
        data: {
          serie: body.serie,
          folio: body.folio,
          fecha: new Date(body.fecha),
          fechaVencimiento: body.fechaVencimiento ? new Date(body.fechaVencimiento) : null,
          moneda: body.moneda,
          tipoCambio: Number(body.tipoCambio),
          condicionesPago: body.condicionesPago || null,
          notas: body.notas || null,
          clientId: body.clienteId,
          subtotal,
          descuento: totalDescuento,
          totalIVA,
          totalIEPS,
          total,
          conceptos: {
            create: body.conceptos.map((c: any) => {
              const importe = Number(c.cantidad) * Number(c.precioUnitario);
              const baseImp = importe - Number(c.descuento || 0);
              return {
                productId: c.productoId || null,
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
                ivaImporte: c.objetoImpuesto !== '01' ? baseImp * Number(c.ivaTasa) : 0,
                iepsImporte: c.objetoImpuesto !== '01' ? baseImp * Number(c.iepsTasa) : 0,
              };
            }),
          },
        },
      });
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error actualizando cotización:", err);
    return NextResponse.json({ error: err?.message || 'Error al actualizar' }, { status: 500 });
  }
}