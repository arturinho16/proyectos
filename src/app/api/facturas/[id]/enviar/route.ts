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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const { destinatario, pdfBase64, xmlContenido } = body ?? {};

    const factura = await prisma.factura.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    const emailDestino = destinatario || factura.client?.email;

    if (!emailDestino) {
      return NextResponse.json(
        { error: 'No hay correo destino' },
        { status: 400 }
      );
    }

    if (!pdfBase64) {
      return NextResponse.json(
        { error: 'No se recibió el PDF para adjuntar' },
        { status: 400 }
      );
    }

    const nombreArchivo = `Factura-${factura.serie ?? ''}${factura.folio}`;
    const xmlFinal = xmlContenido || factura.xmlTimbrado || '';

    const attachments: any[] = [
      {
        filename: `${nombreArchivo}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
      },
    ];

    if (xmlFinal) {
      attachments.push({
        filename: `${nombreArchivo}.xml`,
        content: xmlFinal,
        contentType: 'application/xml; charset=utf-8',
      });
    }

    await transporter.sendMail({
      from: `"TuFisTi Facturación" <${process.env.GMAIL_USER}>`,
      to: emailDestino,
      subject: `Factura ${factura.serie ?? ''}${factura.folio} - ${factura.client?.nombreRazonSocial
        }`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #7c3aed; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">TuFisTi</h1>
          </div>
          <div style="padding: 24px; background: #f9fafb;">
            <p>Estimado(a) <strong>${factura.client?.nombreRazonSocial}</strong>,</p>
            <p>Adjunto encontrará su factura en formato PDF ${xmlFinal ? 'y XML ' : ''
        }correspondiente a su comprobante fiscal.</p>
          </div>
        </div>
      `,
      text: `Estimado(a) ${factura.client?.nombreRazonSocial
        }, adjunto encontrará su factura en formato PDF ${xmlFinal ? 'y XML ' : ''
        }correspondiente a su comprobante fiscal.`,
      attachments,
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Correo enviado a ${emailDestino}`,
    });
  } catch (error: any) {
    console.error('Error enviando correo:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al enviar correo' },
      { status: 500 }
    );
  }
}