import { NextRequest, NextResponse } from 'next/server';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import {
    SAT_SESSION_COOKIE,
    createSatSession,
    clearSatSessionById,
    getSatSessionFromRequest,
} from '@/lib/sat/session-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const satSession = getSatSessionFromRequest(req);

    if (!satSession) {
        return NextResponse.json({ activa: false });
    }

    return NextResponse.json({
        activa: true,
        rfc: satSession.rfc,
        createdAt: satSession.createdAt,
    });
}

export async function POST(req: NextRequest) {
    try {
        const oldSessionId = req.cookies.get(SAT_SESSION_COOKIE)?.value;

        const formData = await req.formData();

        const rfc = String(formData.get('rfc') || '').trim().toUpperCase();
        const password = String(formData.get('password') || '');

        const cerFile = formData.get('cer');
        const keyFile = formData.get('key');

        if (!rfc || !password || !(cerFile instanceof File) || !(keyFile instanceof File)) {
            return NextResponse.json(
                { error: 'Debes enviar RFC, archivo .cer, archivo .key y contraseña.' },
                { status: 400 }
            );
        }

        if (!cerFile.name.toLowerCase().endsWith('.cer')) {
            return NextResponse.json({ error: 'El archivo del certificado debe ser .cer' }, { status: 400 });
        }

        if (!keyFile.name.toLowerCase().endsWith('.key')) {
            return NextResponse.json({ error: 'El archivo de la llave privada debe ser .key' }, { status: 400 });
        }

        const cerBuffer = Buffer.from(await cerFile.arrayBuffer());
        const keyBuffer = Buffer.from(await keyFile.arrayBuffer());

        const cerString = cerBuffer.toString('binary');
        const keyString = keyBuffer.toString('binary');

        new DescargaMasivaSAT(cerString, keyString, password);

        if (oldSessionId) {
            clearSatSessionById(oldSessionId);
        }

        const sessionId = createSatSession({
            rfc,
            cerBase64: cerBuffer.toString('base64'),
            keyBase64: keyBuffer.toString('base64'),
            password,
        });

        const response = NextResponse.json({
            ok: true,
            activa: true,
            rfc,
            mensaje: 'Sesión SAT iniciada correctamente.',
        });

        response.cookies.set(SAT_SESSION_COOKIE, sessionId, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 8,
        });

        return response;
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'No fue posible validar la e.firma.' },
            { status: 400 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const sessionId = req.cookies.get(SAT_SESSION_COOKIE)?.value;

    clearSatSessionById(sessionId);

    const response = NextResponse.json({
        ok: true,
        activa: false,
        mensaje: 'Sesión SAT cerrada.',
    });

    response.cookies.set(SAT_SESSION_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });

    return response;
}