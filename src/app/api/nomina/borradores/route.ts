import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener todos los recibos en BORRADOR para la tabla
export async function GET() {
    try {
        const borradores = await prisma.reciboNomina.findMany({
            where: { estado: 'BORRADOR' },
            include: {
                empleado: true,
                percepciones: true,
                deducciones: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(borradores);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: "Boton de pánico" para generar borradores de prueba a todos los empleados
export async function POST() {
    try {
        const empleados = await prisma.empleado.findMany();
        if (empleados.length === 0) throw new Error("No hay empleados para generar nómina.");

        const generados = [];

        for (const emp of empleados) {
            // Simulamos una quincena
            const salarioDiario = Number(emp.salario) || 250;
            const diasPagados = 15;
            const totalSueldo = salarioDiario * diasPagados;
            const isrSimulado = totalSueldo * 0.10; // 10% de ISR para la prueba
            const totalNeto = totalSueldo - isrSimulado;

            const recibo = await prisma.reciboNomina.create({
                data: {
                    empleadoId: emp.id,
                    fechaPago: new Date(),
                    fechaInicialPago: new Date('2026-04-01T00:00:00Z'),
                    fechaFinalPago: new Date('2026-04-15T00:00:00Z'),
                    numDiasPagados: diasPagados,
                    totalPercepciones: totalSueldo,
                    totalDeducciones: isrSimulado,
                    totalNeto: totalNeto,
                    estado: 'BORRADOR',
                    percepciones: {
                        create: [{
                            tipoPercepcion: '001', // Sueldos
                            clave: 'P-001',
                            concepto: 'Sueldo Quincenal',
                            importeGravado: totalSueldo,
                            importeExento: 0
                        }]
                    },
                    deducciones: {
                        create: [{
                            tipoDeduccion: '002', // ISR
                            clave: 'D-002',
                            concepto: 'Retención de ISR',
                            importe: isrSimulado
                        }]
                    }
                }
            });
            generados.push(recibo);
        }

        return NextResponse.json({ message: `Se generaron ${generados.length} borradores de prueba exitosamente.` });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}