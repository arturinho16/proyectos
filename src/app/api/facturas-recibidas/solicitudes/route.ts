import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const solicitudes = await prisma.solicitudSat.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                requestId: true,
                fechaInicio: true,
                fechaFin: true,
                estado: true,
                mensajeSat: true,
                createdAt: true,
            },
        });

        return NextResponse.json(solicitudes);
    } catch (error: any) {
        console.error('Error obteniendo historial SAT:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}