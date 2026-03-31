import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── LECTURA PARA AUTO-LLENAR FACTURA ──────────────────────────────────────
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
