import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mes = parseInt(searchParams.get('mes') || '0', 10);
    const anio = parseInt(searchParams.get('anio') || '2026', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '50', 10);
    const countOnly = searchParams.get('countOnly') === 'true';

    try {
        // Definir el rango del mes
        const fechaInicio = new Date(anio, mes, 1).toISOString();
        const fechaFin = new Date(anio, mes + 1, 0, 23, 59, 59).toISOString();

        const whereClause = {
            fecha: { gte: fechaInicio, lte: fechaFin },
            estado: 'TIMBRADO', // Solo facturas válidas
            xmlTimbrado: { not: null }
        };

        // Si solo queremos saber cuántas hay en total para calcular la barra de progreso
        if (countOnly) {
            const total = await prisma.factura.count({ where: whereClause });
            return NextResponse.json({ total });
        }

        // Traer el lote específico
        const facturas = await prisma.factura.findMany({
            where: whereClause,
            include: { client: true, conceptos: true },
            orderBy: { fecha: 'asc' },
            skip,
            take,
        });

        return NextResponse.json(facturas);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}