import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newProduct = await prisma.product.create({
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion || body.nombre,
        precio: parseFloat(body.precio),
        codigoInterno: body.codigoInterno || null,
        
        claveProdServ: body.claveProdServ,
        claveUnidad: body.claveUnidad,
        unidad: body.unidad,
        objetoImpuesto: body.objetoImpuesto || '02',
        ivaTasa: parseFloat(body.ivaTasa || '0.16'),
        iepsTasa: parseFloat(body.iepsTasa || '0.00'),
      },
    });
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('Error POST:', error);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
