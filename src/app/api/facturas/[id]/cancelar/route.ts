import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── PATCH /api/facturas/[id]/cancelar ───────────────────────────────────────
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    const factura = await prisma.factura.findUnique({ where: { id } });

    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    if (factura.estado === 'CANCELADO') {
      return NextResponse.json({ error: 'La factura ya está cancelada' }, { status: 409 });
    }

    const cancelada = await prisma.factura.update({
      where: { id },
      data: { estado: 'CANCELADO' },
    });

    return NextResponse.json({ ok: true, factura: cancelada });
  } catch (err: any) {
    console.error('❌ Error al cancelar factura:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
