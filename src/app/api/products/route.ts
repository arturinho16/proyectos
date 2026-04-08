import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const product = await prisma.product.create({
      data: {
        numeroInterno: data.numeroInterno,
        nombre: data.nombre,
        codigoInterno: data.codigoInterno,
        descripcion: data.descripcion,
        precio: data.precio,
        ivaTasa: data.ivaTasa,
        iepsTasa: data.iepsTasa,
        claveProdServ: data.claveProdServ,
        claveUnidad: data.claveUnidad,
        unidad: data.unidad,
        objetoImpuesto: data.objetoImpuesto,
        cuentaPredial: data.cuentaPredial,
        numeroPedimento: data.numeroPedimento,
        impuestoLocal: data.impuestoLocal,
      },
    });

    // ─── LÓGICA DE APRENDIZAJE: GUARDAR NUEVAS CLAVES SAT ───
    if (data.claveProdServ) {
      await prisma.satClaveProdServ.upsert({
        where: { clave: data.claveProdServ },
        update: {}, // Si ya existe, no hace nada
        create: {
          clave: data.claveProdServ,
          descripcion: data.nombre, // Usamos el nombre del producto como descripción provisional
        }
      });
    }

    if (data.claveUnidad && data.unidad) {
      await prisma.satClaveUnidad.upsert({
        where: { clave: data.claveUnidad },
        update: {},
        create: {
          clave: data.claveUnidad,
          nombre: data.unidad,
        }
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}