import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import { getSatSessionFromRequest } from '@/lib/sat/session-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const facturas = await prisma.facturaRecibida.findMany({
      orderBy: { fechaEmision: 'desc' },
    });

    return NextResponse.json(facturas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const satSession = getSatSessionFromRequest(req);

    if (!satSession) {
      return NextResponse.json(
        { error: 'No hay una sesión SAT activa. Inicia sesión con tu .cer, .key y contraseña.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { fechaInicio, fechaFin } = body;

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Faltan las fechas de inicio y fin.' }, { status: 400 });
    }

    let start = new Date(`${fechaInicio}T00:00:00`);
    let end = new Date(`${fechaFin}T23:59:59`);
    const now = new Date();

    if (end > now) {
      end = now;
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'La fecha de inicio no puede ser mayor a la fecha final.' },
        { status: 400 }
      );
    }

    const solicitudExistente = await prisma.solicitudSat.findFirst({
      where: {
        fechaInicio: start,
        fechaFin: end,
        estado: { in: ['COMPLETADA', 'PENDIENTE', 'EN_PROCESO'] },
      },
    });

    if (solicitudExistente) {
      return NextResponse.json(
        { error: `Ese rango exacto de fechas ya fue solicitado. Token: ${solicitudExistente.requestId}` },
        { status: 400 }
      );
    }

    const satService = new DescargaMasivaSAT(
      satSession.cerString,
      satSession.keyString,
      satSession.password
    );

    const formatToSAT = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const strInicio = formatToSAT(start);
    const strFin = formatToSAT(end);

    const requestId = await satService.solicitarFacturasRecibidas(strInicio, strFin);

    await prisma.solicitudSat.create({
      data: {
        requestId,
        fechaInicio: start,
        fechaFin: end,
        estado: 'PENDIENTE',
        mensajeSat: `Solicitud creada correctamente para RFC ${satSession.rfc}. Pendiente de verificación con SAT.`,
      },
    });

    return NextResponse.json({
      ok: true,
      mensaje: `¡Petición enviada! El SAT asignó el Token: ${requestId}`,
    });
  } catch (error: any) {
    console.error('Error en sincronización SAT:', error);
    return NextResponse.json(
      { error: error.message || 'Error al contactar al SAT' },
      { status: 500 }
    );
  }
}