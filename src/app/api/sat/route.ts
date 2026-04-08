import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo'); // 'producto' o 'unidad'
  const q = searchParams.get('q');

  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    if (tipo === 'producto') {
      const resultados = await prisma.satClaveProdServ.findMany({
        where: {
          activo: true,
          OR: [
            { clave: { contains: q, mode: 'insensitive' } },
            { descripcion: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: 20 // Límite para autocompletado rápido
      });
      return NextResponse.json(resultados);
    } 
    
    if (tipo === 'unidad') {
      const resultados = await prisma.satClaveUnidad.findMany({
        where: {
          activo: true,
          OR: [
            { clave: { contains: q, mode: 'insensitive' } },
            { nombre: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: 20
      });
      return NextResponse.json(resultados);
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
