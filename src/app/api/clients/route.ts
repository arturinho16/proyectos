import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── GET — listar todos los clientes ──────────────────────────────────────────
export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(clients);
  } catch (err) {
    console.error('GET /api/clients error:', err);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

// ── POST — crear cliente ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ✅ Solo estos 4 son obligatorios (email ya NO es requerido)
    const required = ['rfc', 'nombreRazonSocial', 'regimenFiscal', 'cp'];
    for (const k of required) {
      if (!body?.[k] || String(body[k]).trim() === '') {
        return NextResponse.json(
          { error: `Falta campo obligatorio: ${k}` },
          { status: 400 }
        );
      }
    }

    const rfc = String(body.rfc).toUpperCase().trim();

    const existe = await prisma.client.findUnique({ where: { rfc } });
    if (existe) {
      return NextResponse.json(
        { error: `El RFC ${rfc} ya está registrado` },
        { status: 409 }
      );
    }

    const client = await prisma.client.create({
      data: {
        rfc,
        nombreRazonSocial: String(body.nombreRazonSocial).toUpperCase().trim(),
        regimenFiscal: String(body.regimenFiscal).trim(),
        cp: String(body.cp).trim(),
        usoCfdiDefault: body.usoCfdiDefault ? String(body.usoCfdiDefault).trim() : 'G03',

        // ✅ Email y contacto — todos opcionales
        email: body.email ? String(body.email).toLowerCase().trim() : null,
        emailOpcional1: body.emailOpcional1 ? String(body.emailOpcional1).toLowerCase().trim() : null,
        emailOpcional2: body.emailOpcional2 ? String(body.emailOpcional2).toLowerCase().trim() : null,
        telefono: body.telefono ? String(body.telefono).trim() : null,
        celular: body.celular ? String(body.celular).trim() : null,
        tipoPersona: body.tipoPersona ? String(body.tipoPersona).trim() : null,

        // Domicilio — todos opcionales
        calle: body.calle ? String(body.calle).toUpperCase().trim() : null,
        numExterior: body.numExterior ? String(body.numExterior).toUpperCase().trim() : null,
        numInterior: body.numInterior ? String(body.numInterior).toUpperCase().trim() : null,
        colonia: body.colonia ? String(body.colonia).toUpperCase().trim() : null,
        municipio: body.municipio ? String(body.municipio).toUpperCase().trim() : null,
        estado: body.estado ? String(body.estado).toUpperCase().trim() : null,
        pais: body.pais ? String(body.pais).toUpperCase().trim() : 'MEXICO',
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error('POST /api/clients error:', err);
    return NextResponse.json({ error: 'Error interno al guardar' }, { status: 500 });
  }
}