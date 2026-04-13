import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import fs from 'fs';
import path from 'path';

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
    // 1. Recibir el mes y año desde la pantalla
    const body = await req.json();
    const { mes, anio } = body; // mes viene de 1 a 12

    if (!mes || !anio) {
      return NextResponse.json({ error: 'Falta especificar el mes y el año.' }, { status: 400 });
    }

    // Calcular el primer y último día de ese mes
    const start = new Date(anio, mes - 1, 1, 0, 0, 0);
    const end = new Date(anio, mes, 0, 23, 59, 59); // El día 0 del mes siguiente es el último del actual

    // 2. VALIDACIÓN DE DUPLICADOS
    const solicitudExistente = await prisma.solicitudSat.findFirst({
      where: {
        fechaInicio: start,
        fechaFin: end,
        estado: { in: ['COMPLETADA', 'PENDIENTE'] }
      }
    });

    if (solicitudExistente) {
      return NextResponse.json({
        error: `El periodo de ${mes}/${anio} ya fue solicitado previamente. Por favor busque en sus descargas o historial.`
      }, { status: 400 });
    }

    // 3. Rutas a tus archivos FIEL
    const cerPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/como891216cm1.cer');
    const keyPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/Claveprivada_FIEL_COMO891216CM1_20260219_140155.key');
    const passwordFiel = 'MONROY1612'; // ⚠️ PON TU CONTRASEÑA

    if (!fs.existsSync(cerPath) || !fs.existsSync(keyPath)) {
      return NextResponse.json({ error: `No se encontraron los archivos FIEL.` }, { status: 400 });
    }

    const cerString = fs.readFileSync(cerPath, 'binary');
    const keyString = fs.readFileSync(keyPath, 'binary');
    const satService = new DescargaMasivaSAT(cerString, keyString, passwordFiel);

    // 4. Formatear fechas para el SAT
    const formatToSAT = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const strInicio = formatToSAT(start);
    const strFin = formatToSAT(end);

    // 5. Solicitar al SAT
    const requestId = await satService.solicitarFacturasRecibidas(strInicio, strFin);

    // 6. Guardar el ticket
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
      mensaje: `Conexión establecida con el SAT para ${mes}/${anio}. Espere unos minutos y compruebe descargas.`
    });

  } catch (error: any) {
    console.error("Error en sincronización SAT:", error);
    return NextResponse.json({ error: error.message || 'Error al contactar al SAT' }, { status: 500 });
  }
}