import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reciboId, destinatario, pdfBase64, xmlContenido } = body ?? {};

    if (!reciboId) return NextResponse.json({ error: 'Falta reciboId' }, { status: 400 });

    const recibo = await prisma.reciboNomina.findUnique({
      where: { id: reciboId },
      include: { empleado: true },
    });

    if (!recibo) return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });

    const to = destinatario || recibo.empleado.email;
    if (!to) return NextResponse.json({ error: 'No hay correo destino' }, { status: 400 });
    if (!pdfBase64) return NextResponse.json({ error: 'No se recibió PDF' }, { status: 400 });

    const nombre = `Nomina-${recibo.empleado.numEmpleado}-${recibo.id.slice(0, 8)}`;
    const xmlFinal = xmlContenido || recibo.xmlTimbrado || '';

    const attachments: any[] = [
      { filename: `${nombre}.pdf`, content: pdfBase64, encoding: 'base64' },
    ];

    if (xmlFinal) {
      attachments.push({
        filename: `${nombre}.xml`,
        content: xmlFinal,
        contentType: 'application/xml; charset=utf-8',
      });
    }

    await transporter.sendMail({
      from: `"TuFisTi Nómina" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Recibo de nómina ${recibo.empleado.nombre} ${recibo.empleado.apellidoPaterno}`,
      html: `<div style="font-family:Arial,sans-serif"><h2 style="color:#4F46E5">TuFisTi Nómina</h2><p>Adjuntamos su recibo de nómina en PDF${xmlFinal ? ' y XML' : ''}.</p></div>`,
      text: `Adjuntamos su recibo de nómina en PDF${xmlFinal ? ' y XML' : ''}.`,
      attachments,
    });

    return NextResponse.json({ ok: true, mensaje: `Correo enviado a ${to}` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al enviar correo de nómina' }, { status: 500 });
  }
}
