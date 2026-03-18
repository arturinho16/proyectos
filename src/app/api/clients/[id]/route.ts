import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── PUT — Editar cliente ──────────────────────────────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar obligatorios
    const required = ['rfc', 'nombreRazonSocial', 'regimenFiscal', 'cp'];
    for (const k of required) {
      if (!body?.[k] || String(body[k]).trim() === '') {
        return NextResponse.json({ error: `Falta campo obligatorio: ${k}` }, { status: 400 });
      }
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        rfc: String(body.rfc).toUpperCase().trim(),
        nombreRazonSocial: String(body.nombreRazonSocial).toUpperCase().trim(),
        regimenFiscal: String(body.regimenFiscal).trim(),
        cp: String(body.cp).trim(),
        usoCfdiDefault: body.usoCfdiDefault ? String(body.usoCfdiDefault).trim() : 'G03',

        // Contacto — opcionales
        email: body.email ? String(body.email).toLowerCase().trim() : null,
        emailOpcional1: body.emailOpcional1 ? String(body.emailOpcional1).toLowerCase().trim() : null,
        emailOpcional2: body.emailOpcional2 ? String(body.emailOpcional2).toLowerCase().trim() : null,
        telefono: body.telefono ? String(body.telefono).trim() : null,
        celular: body.celular ? String(body.celular).trim() : null,
        tipoPersona: body.tipoPersona ? String(body.tipoPersona).trim() : null,

        // Domicilio — opcionales
        calle: body.calle ? String(body.calle).toUpperCase().trim() : null,
        numExterior: body.numExterior ? String(body.numExterior).toUpperCase().trim() : null,
        numInterior: body.numInterior ? String(body.numInterior).toUpperCase().trim() : null,
        colonia: body.colonia ? String(body.colonia).toUpperCase().trim() : null,
        municipio: body.municipio ? String(body.municipio).toUpperCase().trim() : null,
        estado: body.estado ? String(body.estado).toUpperCase().trim() : null,
        pais: body.pais ? String(body.pais).toUpperCase().trim() : 'MEXICO',
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error('PUT /api/clients/[id] error:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── DELETE — Eliminar cliente ─────────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.client.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('DELETE /api/clients/[id] error:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}