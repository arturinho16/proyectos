import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('estado') ?? 'PENDIENTE';

  const recibos = await prisma.reciboNomina.findMany({
    where: {
      estado: estado === 'PENDIENTE' ? 'PENDIENTE_APROBACION' : undefined,
    },
    include: { empleado: true },
    orderBy: { fechaPago: 'desc' },
  });

  const items = recibos.map((r) => ({
    id: r.id,
    empleadoId: r.empleadoId,
    empleadoNombre: `${r.empleado.nombre} ${r.empleado.apellidoPaterno}`,
    empleadoRfc: r.empleado.rfc,
    totalNeto: Number(r.totalNeto),
    totalPercepciones: Number(r.totalPercepciones),
    totalDeducciones: Number(r.totalDeducciones),
    fechaPago: r.fechaPago.toISOString(),
    estado: r.estado,
  }));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reciboId, estado } = body as { reciboId?: string; estado?: 'APROBADA' | 'RECHAZADA' };

    if (!reciboId || !estado) {
      return NextResponse.json({ error: 'Faltan parámetros reciboId y estado.' }, { status: 400 });
    }

    const nextEstado = estado === 'APROBADA' ? 'APROBADA' : 'RECHAZADA';

    const updated = await prisma.$transaction(async (tx) => {
      await tx.nominaAprobacion.create({
        data: {
          reciboNominaId: reciboId,
          estado: nextEstado,
          aprobadoEn: estado === 'APROBADA' ? new Date() : null,
          rechazadoEn: estado === 'RECHAZADA' ? new Date() : null,
        },
      });

      return tx.reciboNomina.update({
        where: { id: reciboId },
        data: { estado: nextEstado },
      });
    });

    return NextResponse.json({ ok: true, recibo: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error al aprobar/rechazar nómina' }, { status: 500 });
  }
}
