import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.master.tufisti@gmail.com,
    pass: process.env.lmfc khqq drjo gdzn,
  },
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { destinatario, pdfBase64 } = await req.json();

    // Obtener datos de la factura
    const factura = await prisma.factura.findUnique({
      where: { id: params.id },
      include: { cliente: true },
    });

    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    const emailDestino = destinatario || factura.cliente?.email;
    if (!emailDestino) {
      return NextResponse.json({ error: 'No hay correo destino' }, { status: 400 });
    }

    await transporter.sendMail({
      from: `"TuFisTi Facturación" <${process.env.GMAIL_USER}>`,
      to: emailDestino,
      subject: `Factura ${factura.serie ?? ''}${factura.folio} - ${factura.cliente?.nombreRazonSocial}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #7c3aed; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">TuFisTi</h1>
            <p style="color: #e9d5ff; margin: 4px 0;">Sistema de Facturación</p>
          </div>
          <div style="padding: 24px; background: #f9fafb;">
            <p>Estimado(a) <strong>${factura.cliente?.nombreRazonSocial}</strong>,</p>
            <p>Adjunto encontrará su factura con los siguientes datos:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr style="background: #ede9fe;">
                <td style="padding: 8px; font-weight: bold;">Folio:</td>
                <td style="padding: 8px;">${factura.serie ?? ''}${factura.folio}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Fecha:</td>
                <td style="padding: 8px;">${new Date(factura.fecha).toLocaleDateString('es-MX')}</td>
              </tr>
              <tr style="background: #ede9fe;">
                <td style="padding: 8px; font-weight: bold;">Total:</td>
                <td style="padding: 8px; font-size: 18px; color: #7c3aed; font-weight: bold;">
                  ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(factura.total))}
                </td>
              </tr>
              ${factura.uuid ? `
              <tr>
                <td style="padding: 8px; font-weight: bold;">UUID:</td>
                <td style="padding: 8px; font-size: 11px;">${factura.uuid}</td>
              </tr>` : ''}
            </table>
            <p style="color: #6b7280; font-size: 13px;">
              Este documento es una representación impresa de un CFDI.
            </p>
          </div>
          <div style="background: #7c3aed; padding: 12px; text-align: center;">
            <p style="color: #e9d5ff; margin: 0; font-size: 12px;">
              TuFisTi • master.tufisti@gmail.com
            </p>
          </div>
        </div>
      `,
      attachments: pdfBase64
        ? [{
            filename: `Factura-${factura.serie ?? ''}${factura.folio}.pdf`,
            content: pdfBase64,
            encoding: 'base64',
          }]
        : [],
    });

    return NextResponse.json({ ok: true, mensaje: `Correo enviado a ${emailDestino}` });
  } catch (error) {
    console.error('Error enviando correo:', error);
    return NextResponse.json({ error: 'Error al enviar correo' }, { status: 500 });
  }
}
