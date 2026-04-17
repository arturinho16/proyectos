import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// OBTENER el empleado actual
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // <-- Aquí se desenvuelve la promesa
        const empleado = await prisma.empleado.findUnique({ where: { id } });

        if (!empleado) {
            return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
        }
        return NextResponse.json(empleado);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ACTUALIZAR el empleado
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // <-- Aquí se desenvuelve la promesa
        const body = await req.json();

        // Convertimos fechas y números
        const dataParaActualizar = {
            ...body,
            fechaRelacionLaboral: body.fechaRelacionLaboral ? new Date(body.fechaRelacionLaboral) : undefined,
            salario: body.salario ? Number(body.salario) : undefined,
            salarioCuotas: body.salarioCuotas ? Number(body.salarioCuotas) : undefined,
            nss: body.nss || null,
            email: body.email || null,
        };

        // Limpiamos datos que no deben actualizarse
        delete dataParaActualizar.id;
        delete dataParaActualizar.createdAt;
        delete dataParaActualizar.updatedAt;

        const empleadoActualizado = await prisma.empleado.update({
            where: { id },
            data: dataParaActualizar
        });

        return NextResponse.json(empleadoActualizado);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'El RFC, CURP o NumEmpleado choca con otro empleado existente.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}