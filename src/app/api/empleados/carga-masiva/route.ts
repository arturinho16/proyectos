import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ==========================================
// GET: Listar todos los empleados
// ==========================================
export async function GET() {
    try {
        const empleados = await prisma.empleado.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(empleados);
    } catch (error: any) {
        console.error("Error obteniendo empleados:", error);
        return NextResponse.json({ error: 'Error al obtener los empleados' }, { status: 500 });
    }
}

// ==========================================
// POST: Crear un nuevo empleado
// ==========================================
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Parseo de datos estrictos para Prisma y el SAT
        // Aseguramos que las fechas sean objetos Date y los salarios sean numéricos
        const dataParaGuardar = {
            ...body,
            fechaRelacionLaboral: new Date(body.fechaRelacionLaboral),
            salario: Number(body.salario),
            salarioCuotas: Number(body.salarioCuotas),
            // Si mandan campos vacíos en strings opcionales, los pasamos a null
            nss: body.nss || null,
            email: body.email || null,
        };

        const nuevoEmpleado = await prisma.empleado.create({
            data: dataParaGuardar
        });

        return NextResponse.json(nuevoEmpleado, { status: 201 });

    } catch (error: any) {
        console.error("Error creando empleado:", error);

        // P2002 es el código de Prisma cuando se viola una restricción UNIQUE (@unique)
        // En tu schema.prisma tienes @unique en curp, rfc y numEmpleado
        if (error.code === 'P2002') {
            const target = error.meta?.target as string[];
            return NextResponse.json(
                { error: `Ya existe un empleado registrado con ese mismo ${target ? target.join(', ') : 'dato único (RFC, CURP o Num Empleado)'}.` },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}