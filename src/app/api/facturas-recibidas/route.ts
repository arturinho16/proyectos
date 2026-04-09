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
    // 1. Rutas exactas a tus archivos FIEL
    const cerPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/como891216cm1.cer');
    const keyPath = path.join(process.cwd(), 'src/lib/sat/certificados/FIEL/Claveprivada_FIEL_COMO891216CM1_20260219_140155.key');

    // ⚠️ REEMPLAZA ESTO CON LA CONTRASEÑA REAL DE TU FIEL
    const passwordFiel = 'MONROY1612';

    if (!fs.existsSync(cerPath) || !fs.existsSync(keyPath)) {
      return NextResponse.json({
        error: `No se encontraron los archivos. Verifica que existan en la carpeta FIEL.`
      }, { status: 400 });
    }

    // NodeCFDI requiere leer los binarios como string
    const cerString = fs.readFileSync(cerPath, 'binary');
    const keyString = fs.readFileSync(keyPath, 'binary');

    // 2. Inicializar nuestro Motor
    const satService = new DescargaMasivaSAT(cerString, keyString, passwordFiel);

    // 3. Formatear fechas (Últimos 40 días)
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 40);

    const formatToSAT = (date: Date) => date.toISOString().replace('T', ' ').substring(0, 19);

    const strInicio = formatToSAT(start);
    const strFin = formatToSAT(end);

    // 4. Solicitar al SAT
    const requestId = await satService.solicitarFacturasRecibidas(strInicio, strFin);

    // 4.5 Guardar el ticket en la Base de Datos para verificarlo después
    await prisma.solicitudSat.create({
      data: {
        requestId,
        fechaInicio: start,
        fechaFin: end,
        estado: 'PENDIENTE'
      }
    });

    // 5. Responder al Frontend (Ya con las llaves cerradas correctamente)
    return NextResponse.json({
      ok: true,
      mensaje: `Conexión establecida con el SAT. ID de Solicitud: ${requestId}`
    });

  } catch (error: any) {
    console.error("Error en sincronización SAT:", error);
    return NextResponse.json({ error: error.message || 'Error al contactar al SAT' }, { status: 500 });
  }
}