import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { csvData } = await req.json();
    
    // Separamos por líneas y limpiamos líneas vacías
    const lines = csvData.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    
    // Asumimos que la primera línea son los encabezados, la saltamos
    const dataLines = lines.slice(1);
    let guardados = 0;

    for (const line of dataLines) {
      const [
        nombre, codigoInterno, precio, claveProdServ, claveUnidad, unidad, objetoImpuesto, ivaTasa, iepsTasa
      ] = line.split(',');

      if (nombre && precio && claveProdServ) {
        await prisma.product.create({
          data: {
            nombre: nombre.trim(),
            codigoInterno: codigoInterno?.trim() || null,
            descripcion: nombre.trim(),
            precio: Number(precio),
            claveProdServ: claveProdServ.trim(),
            claveUnidad: claveUnidad?.trim() || 'H87',
            unidad: unidad?.trim() || 'Pieza',
            objetoImpuesto: objetoImpuesto?.trim() || '02',
            ivaTasa: Number(ivaTasa || 0.16),
            iepsTasa: Number(iepsTasa || 0),
          }
        });
        guardados++;
      }
    }

    return NextResponse.json({ success: true, count: guardados });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
