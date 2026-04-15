import { NextResponse } from 'next/server';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import { clearSatSession, getSatSession, setSatSession } from '@/lib/sat/session-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const session = getSatSession();

    return NextResponse.json({
        activa: Boolean(session),
        rfc: session?.rfc || '',
    });
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        const rfc = String(formData.get('rfc') || '').trim().toUpperCase();
        const password = String(formData.get('password') || '').trim();
        const cer = formData.get('cer');
        const key = formData.get('key');

        if (!rfc || !password || !cer || !key) {
            return NextResponse.json(
                { error: 'Faltan RFC, contraseña, archivo .cer o archivo .key.' },
                { status: 400 }
            );
        }

        if (!(cer instanceof File) || !(key instanceof File)) {
            return NextResponse.json(
                { error: 'Los archivos .cer y .key no fueron recibidos correctamente.' },
                { status: 400 }
            );
        }

        const cerBuffer = Buffer.from(await cer.arrayBuffer());
        const keyBuffer = Buffer.from(await key.arrayBuffer());

        // Validación real de la e.firma
        new DescargaMasivaSAT(
            cerBuffer.toString('binary'),
            keyBuffer.toString('binary'),
            password
        );

        setSatSession({
            rfc,
            password,
            cerBase64: cerBuffer.toString('base64'),
            keyBase64: keyBuffer.toString('base64'),
        });

        return NextResponse.json({
            ok: true,
            activa: true,
            rfc,
            mensaje: 'Sesión SAT iniciada correctamente.',
        });
    } catch (error: any) {
        console.error('Error al iniciar sesión SAT:', error);

        return NextResponse.json(
            { error: error?.message || 'No fue posible iniciar la sesión SAT.' },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    clearSatSession();

    return NextResponse.json({
        ok: true,
        mensaje: 'Sesión SAT cerrada correctamente.',
    });
}