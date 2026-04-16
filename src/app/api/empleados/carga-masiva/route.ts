import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
        }

        const text = await file.text();
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);

        // Quitar la cabecera
        const headers = rows.shift();
        const empleadosParaInsertar = [];

        for (const row of rows) {
            // Manejo básico de CSV (para casos con comas en campos se recomienda usar una librería como 'csv-parse')
            const cols = row.split(',');

            if (cols.length < 30) continue;

            empleadosParaInsertar.push({
                nombre: cols[0],
                apellidoPaterno: cols[1],
                apellidoMaterno: cols[2] || null,
                curp: cols[3],
                nss: cols[4] || null,
                rfc: cols[5],
                calle: cols[6],
                colonia: cols[7],
                numExterior: cols[8],
                numInterior: cols[9] || null,
                cp: cols[10],
                localidad: cols[11] || null,
                municipio: cols[12],
                estado: cols[13],
                email: cols[14],
                grupo: cols[15],
                sucursal: cols[16],
                fechaRelacionLaboral: new Date(cols[17]), // Formato debe ser YYYY-MM-DD
                salario: parseFloat(cols[18] || '0'),
                salarioCuotas: parseFloat(cols[19] || '0'),
                contrato: cols[20], // Ej: 01
                regimenContratacion: cols[21], // Ej: 02
                riesgoPuesto: cols[22], // Ej: 1
                tipoJornada: cols[23], // Ej: 01
                banco: cols[24] || null,
                clabe: cols[25] || null,
                periodicidad: cols[26], // Ej: 04 (Quincenal)
                departamento: cols[27],
                puesto: cols[28],
                numEmpleado: cols[29],
            });
        }

        // Inserción transaccional masiva
        const creados = await prisma.$transaction(
            empleadosParaInsertar.map(emp =>
                prisma.empleado.upsert({
                    where: { rfc: emp.rfc },
                    update: emp,
                    create: emp
                })
            )
        );

        return NextResponse.json({ message: `Se procesaron ${creados.length} empleados con éxito.` });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}