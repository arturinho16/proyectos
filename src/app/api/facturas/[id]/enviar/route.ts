import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { destinatario, pdfBase64, xmlContenido } = await req.json();

    const factura = await prisma.factura.findUnique({ where: { id }, include: { client: true } });
    if (!factura) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });

    const emailDestino = destinatario || factura.client?.email;
    if (!emailDestino) return NextResponse.json({ error: 'No hay correo destino' }, { status: 400 });

    const nombreArchivo = `Factura-${factura.serie ?? ''}${factura.folio}`;

    // 🔴 FORZAMOS EL ARREGLO DE ADJUNTOS AQUÍ
    const adjuntos = [];
    if (pdfBase64) adjuntos.push({ filename: `${nombreArchivo}.pdf`, content: pdfBase64, encoding: 'base64' });

    // Si viene el string del XML, lo convertimos en buffer y lo mandamos
    if (xmlContenido) {
      adjuntos.push({
        filename: `${nombreArchivo}.xml`,
        content: Buffer.from(xmlContenido, 'utf-8'),
        contentType: 'application/xml',
      });
    }

    await transporter.sendMail({
      from: `"TuFisTi Facturación" <${process.env.GMAIL_USER}>`,
      to: emailDestino,
      subject: `Factura ${factura.serie ?? ''}${factura.folio} - ${factura.client?.nombreRazonSocial}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #7c3aed; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">TuFisTi</h1>
          </div>
          <div style="padding: 24px; background: #f9fafb;">
            <p>Estimado(a) <strong>${factura.client?.nombreRazonSocial}</strong>,</p>
            <p>Adjunto encontrará su factura en formato PDF y XML.</p>
          </div>
        </div>
      `,
      attachments: adjuntos,
    });

    return NextResponse.json({ ok: true, mensaje: `Correo enviado a ${emailDestino}` });
  } catch (error: any) {
    console.error('Error enviando correo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}