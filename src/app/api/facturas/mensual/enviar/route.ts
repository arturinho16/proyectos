import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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
        const { destinatario, mesNombre, anio, pdfBase64, zipBase64 } = body;

        if (!destinatario || !pdfBase64 || !zipBase64) {
            return NextResponse.json({ error: 'Faltan datos o archivos adjuntos' }, { status: 400 });
        }

        const attachments = [
            {
                filename: `Consolidado_Facturas_${mesNombre}_${anio}.pdf`,
                content: pdfBase64,
                encoding: 'base64',
            },
            {
                filename: `Consolidado_XMLs_${mesNombre}_${anio}.zip`,
                content: zipBase64,
                encoding: 'base64',
            }
        ];

        await transporter.sendMail({
            from: `"TuFisTi Facturación" <${process.env.GMAIL_USER}>`,
            to: destinatario,
            subject: `Cierre Contable - Facturas de ${mesNombre} ${anio}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563eb; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">TuFisTi</h1>
          </div>
          <div style="padding: 24px; background: #f8fafc;">
            <h2 style="color: #1e293b;">Consolidado Mensual</h2>
            <p style="color: #475569; font-size: 16px;">
              Adjunto encontrarás el consolidado de facturas en PDF y el archivo ZIP con todos los XML correspondientes al mes de <b>${mesNombre} ${anio}</b>.
            </p>
          </div>
        </div>
      `,
            attachments,
        });

        return NextResponse.json({ ok: true, mensaje: `Correo enviado exitosamente a ${destinatario}` });
    } catch (error: any) {
        console.error('Error enviando consolidado:', error);
        return NextResponse.json({ error: error.message || 'Error al enviar correo' }, { status: 500 });
    }
}