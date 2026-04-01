import { NextResponse } from 'next/server';
// Nota: Aquí podrías importar tu cliente de prisma si decides subir el catálogo a la DB
// import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (q.length < 3) return NextResponse.json([]);

    // Simulamos una base de datos más robusta. 
    // En producción, aquí harías: await prisma.catalogoSat.findMany(...)
    const catalogoSat = [
      { clave: '01010101', descripcion: 'No existe en el catálogo' },
      { clave: '84111506', descripcion: 'Servicios de facturación' },
      { clave: '43231500', descripcion: 'Software de gestión' },
      { clave: '81111500', descripcion: 'Ingeniería de software' },
      { clave: '81111508', descripcion: 'Mantenimiento y reparación de software' },
      { clave: '10101501', descripcion: 'Gatos' }, // El clásico ejemplo del SAT
    ];

    const esNumero = /^\d+$/.test(q);

    const filtrados = catalogoSat.filter(item => {
      if (esNumero) {
        // Búsqueda por CLAVE (comienza con los números que pongas)
        return item.clave.startsWith(q);
      } else {
        // Búsqueda por TEXTO (contiene las palabras)
        return item.descripcion.toLowerCase().includes(q.toLowerCase());
      }
    });

    // Limitamos a 10 resultados para que el dropdown de la UI no sea gigante
    return NextResponse.json(filtrados.slice(0, 10));
  } catch (error) {
    return NextResponse.json({ error: 'Error en la búsqueda' }, { status: 500 });
  }
}