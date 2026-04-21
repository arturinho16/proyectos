import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generarXMLNomina } from '@/app/nomina/facturacion-masiva/utils/generarXMLNomina';
import { validarXMLNomina } from '@/app/nomina/facturacion-masiva/utils/validarXMLNomina';
import { buildCadenaOriginal } from '@/lib/sat/cadenaOriginal';
import { generarSello, getCertificadoBase64, getNoCertificado, keyToPem } from '@/lib/sat/firmar';
import { timbrarNominaFinkok } from '@/lib/sat/timbrarNominaFinkok';

export async function GET() {
  const recibos = await prisma.reciboNomina.findMany({
    where: { estado: 'APROBADA' },
    include: { empleado: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    items: recibos.map((r) => ({
      id: r.id,
      empleadoId: r.empleadoId,
      empleadoNombre: `${r.empleado.nombre} ${r.empleado.apellidoPaterno}`,
      empleadoRfc: r.empleado.rfc,
      totalNeto: Number(r.totalNeto),
      totalPercepciones: Number(r.totalPercepciones),
      totalDeducciones: Number(r.totalDeducciones),
      fechaPago: r.fechaPago.toISOString(),
      estado: r.estado,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const reciboId = body?.reciboId as string | undefined;

  if (!reciboId) {
    return NextResponse.json({ error: 'Falta reciboId' }, { status: 400 });
  }

  const recibo = await prisma.reciboNomina.findUnique({
    where: { id: reciboId },
    include: { empleado: true, percepciones: true, deducciones: true },
  });

  if (!recibo) return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
  if (recibo.estado !== 'APROBADA') return NextResponse.json({ error: 'Solo se pueden timbrar recibos aprobados' }, { status: 400 });

  const cerB64 = process.env.CSD_CERTIFICADO_B64;
  const keyB64 = process.env.CSD_LLAVE_B64;
  const csdPassword = process.env.CSD_PASSWORD;

  if (!cerB64 || !keyB64 || !csdPassword) {
    return NextResponse.json({ error: 'Faltan variables CSD_CERTIFICADO_B64/CSD_LLAVE_B64/CSD_PASSWORD' }, { status: 500 });
  }

  try {
    const noCertificado = getNoCertificado(cerB64);
    const certificadoB64 = getCertificadoBase64(cerB64);

    const xmlUnsigned = generarXMLNomina(
      {
        id: recibo.id,
        fechaPago: recibo.fechaPago,
        fechaInicialPago: recibo.fechaInicialPago,
        fechaFinalPago: recibo.fechaFinalPago,
        numDiasPagados: Number(recibo.numDiasPagados),
        totalPercepciones: Number(recibo.totalPercepciones),
        totalDeducciones: Number(recibo.totalDeducciones),
        totalOtrosPagos: Number(recibo.totalOtrosPagos),
        totalNeto: Number(recibo.totalNeto),
        percepciones: recibo.percepciones.map((p) => ({
          tipoPercepcion: p.tipoPercepcion,
          clave: p.clave,
          concepto: p.concepto,
          importeGravado: Number(p.importeGravado),
          importeExento: Number(p.importeExento),
        })),
        deducciones: recibo.deducciones.map((d) => ({
          tipoDeduccion: d.tipoDeduccion,
          clave: d.clave,
          concepto: d.concepto,
          importe: Number(d.importe),
        })),
      },
      {
        nombre: recibo.empleado.nombre,
        apellidoPaterno: recibo.empleado.apellidoPaterno,
        apellidoMaterno: recibo.empleado.apellidoMaterno,
        curp: recibo.empleado.curp,
        rfc: recibo.empleado.rfc,
        nss: recibo.empleado.nss,
        fechaRelacionLaboral: recibo.empleado.fechaRelacionLaboral,
        contrato: recibo.empleado.contrato,
        tipoJornada: recibo.empleado.tipoJornada,
        regimenContratacion: recibo.empleado.regimenContratacion,
        numEmpleado: recibo.empleado.numEmpleado,
        departamento: recibo.empleado.departamento,
        puesto: recibo.empleado.puesto,
        periodicidad: recibo.empleado.periodicidad,
        estado: recibo.empleado.estado,
        riesgoPuesto: recibo.empleado.riesgoPuesto,
        salarioCuotas: Number(recibo.empleado.salarioCuotas),
      },
      noCertificado,
      certificadoB64,
    );

    const validation = validarXMLNomina(xmlUnsigned);
    if (!validation.isValid) {
      await prisma.registroTimbrado.create({
        data: {
          reciboNominaId: reciboId,
          estatus: 'VALIDACION',
          codigoError: validation.errors[0]?.code,
          mensajeError: validation.errors.map((e) => `[${e.code}] ${e.message}`).join('\n'),
          xmlGenerado: xmlUnsigned,
        },
      });

      return NextResponse.json({ error: 'XML inválido para timbrar', details: validation.errors }, { status: 422 });
    }

    const keyPem = keyToPem(keyB64, csdPassword);
    const cadenaOriginal = await buildCadenaOriginal(xmlUnsigned);
    const sello = generarSello(cadenaOriginal, keyPem);
    const xmlFirmado = xmlUnsigned.replace('Sello="PENDIENTE_SELLO"', `Sello="${sello}"`);

    const timbrado = await timbrarNominaFinkok(xmlFirmado);

    const updated = await prisma.$transaction(async (tx) => {
      const reciboUpdated = await tx.reciboNomina.update({
        where: { id: reciboId },
        data: {
          estado: 'TIMBRADA',
          uuid: timbrado.uuid,
          xmlTimbrado: timbrado.xmlTimbrado,
          mensajeError: null,
        },
      });

      await tx.registroTimbrado.create({
        data: {
          reciboNominaId: reciboId,
          estatus: 'EXITOSO',
          uuid: timbrado.uuid,
          xmlGenerado: xmlFirmado,
          xmlTimbrado: timbrado.xmlTimbrado,
          acuseRaw: JSON.stringify(timbrado.raw),
          timbradoEn: new Date(),
        },
      });

      await tx.configuracionFiscal.updateMany({
        where: { activo: true },
        data: {
          folioNominaActual: { increment: 1 },
          timbresUsados: { increment: 1 },
          timbresDisponibles: { decrement: 1 },
        },
      });

      return reciboUpdated;
    });

    return NextResponse.json({ ok: true, recibo: updated, uuid: timbrado.uuid, xmlTimbrado: timbrado.xmlTimbrado });
  } catch (error: any) {
    await prisma.registroTimbrado.create({
      data: {
        reciboNominaId: reciboId,
        estatus: 'FALLIDO',
        mensajeError: error?.message ?? 'Error desconocido',
      },
    });

    await prisma.reciboNomina.update({
      where: { id: reciboId },
      data: { estado: 'ERROR', mensajeError: error?.message ?? 'Error desconocido' },
    });

    return NextResponse.json({ error: error?.message ?? 'Error al timbrar nómina' }, { status: 500 });
  }
}
