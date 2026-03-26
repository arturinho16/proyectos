import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── ELIMINAR PRODUCTO (Tu código original intacto) ────────────────────────
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'No se pudo eliminar el producto' },
      { status: 500 }
    );
  }
}

// ─── EDITAR/ACTUALIZAR PRODUCTO (Nuevo) ────────────────────────────────────
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();

    // Aseguramos que los valores numéricos se guarden como números en Prisma
    const precio = Number(body.precio);
    const ivaTasa = Number(body.ivaTasa);
    const iepsTasa = Number(body.iepsTasa || 0);

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        nombre: body.nombre,
        codigoInterno: body.codigoInterno,
        descripcion: body.descripcion || body.nombre, // Usamos el nombre como descripción si viene vacío
        precio,
        ivaTasa,
        iepsTasa,
        claveProdServ: body.claveProdServ,
        claveUnidad: body.claveUnidad,
        unidad: body.unidad,
        objetoImpuesto: body.objetoImpuesto,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'No se pudo actualizar el producto' },
      { status: 500 }
    );
  }
}