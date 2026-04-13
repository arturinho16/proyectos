import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import fs from 'fs';
import path from 'path';

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
        const body = await req.json();
        const { fechaInicio, fechaFin } = body;

        if (!fechaInicio || !fechaFin) {
            return NextResponse.json({ error: 'Faltan las fechas de inicio y fin.' }, { status: 400 });
        }

        let start = new Date(`${fechaInicio}T00:00:00`);
        let end = new Date(`${fechaFin}T23:59:59`);
        const now = new Date();

        // ⚠️ REGLA DEL SAT: No pedir fechas futuras. Si es futuro, lo topamos a la hora actual.
        if (end > now) {
            end = now;
        }

        if (start > end) {
            return NextResponse.json({ error: 'La fecha de inicio no puede ser mayor a la fecha final.' }, { status: 400 });
        }

        // VALIDACIÓN DE DUPLICADOS EXACTOS
        const solicitudExistente = await prisma.solicitudSat.findFirst({
            where: {
                fechaInicio: start,
                fechaFin: end,
                estado: { in: ['COMPLETADA', 'PENDIENTE'] }
            }
        });

        if (solicitudExistente) {
            return NextResponse.json({
                error: `Ese rango exacto de fechas ya fue solicitado. Token: ${solicitudExistente.requestId}`
            }, { status: 400 });
        }

        const cerPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/como891216cm1.cer');
        const keyPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/Claveprivada_FIEL_COMO891216CM1_20260219_140155.key');
        const passwordFiel = 'MONROY1612';

        if (!fs.existsSync(cerPath) || !fs.existsSync(keyPath)) {
            return NextResponse.json({ error: `No se encontraron los archivos FIEL.` }, { status: 400 });
        }

        const cerString = fs.readFileSync(cerPath, 'binary');
        const keyString = fs.readFileSync(keyPath, 'binary');
        const satService = new DescargaMasivaSAT(cerString, keyString, passwordFiel);

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
                estado: 'PENDIENTE'
            }
        });

        return NextResponse.json({
            ok: true,
            mensaje: `¡Petición enviada! El SAT asignó el Token: ${requestId}`
        });

    } catch (error: any) {
        console.error("Error en sincronización SAT:", error);
        return NextResponse.json({ error: error.message || 'Error al contactar al SAT' }, { status: 500 });
    }
}