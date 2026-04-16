import { create } from 'xmlbuilder2';
import * as soap from 'soap';
import { keyToPem, getNoCertificado, getCertificadoBase64, generarSello } from './firmar';
import { buildCadenaOriginal } from './timbrar'; // Reutilizamos tu función de XSLT

export function generarXMLNomina(datosRecibo: any, empleado: any, noCertificado: string, certificadoB64: string): string {
    // Configuración base obligatoria para Nómina 1.2 en CFDI 4.0
    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('cfdi:Comprobante', {
            'xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
            'xmlns:nomina12': 'http://www.sat.gob.mx/nomina12',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            'xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd',
            Version: '4.0',
            Serie: 'NOM',
            Folio: datosRecibo.id.split('-')[0], // Folio interno
            Fecha: new Date().toISOString().split('.')[0], // Formato YYYY-MM-DDTHH:mm:ss
            Sello: '',
            NoCertificado: noCertificado,
            Certificado: certificadoB64,
            SubTotal: datosRecibo.totalPercepciones.toFixed(2),
            Descuento: datosRecibo.totalDeducciones.toFixed(2),
            Moneda: 'MXN',
            Total: datosRecibo.totalNeto.toFixed(2),
            TipoDeComprobante: 'N', // N = Nómina
            Exportacion: '01',
            MetodoPago: 'PUE',
            LugarExpedicion: process.env.EMISOR_CP || '00000',
        });

    // Emisor
    root.ele('cfdi:Emisor', {
        Rfc: process.env.EMISOR_RFC,
        Nombre: process.env.EMISOR_NOMBRE,
        RegimenFiscal: process.env.EMISOR_REGIMEN_FISCAL
    }).up();

    // Receptor
    root.ele('cfdi:Receptor', {
        Rfc: empleado.rfc,
        Nombre: `${empleado.nombre} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno || ''}`.trim(),
        DomicilioFiscalReceptor: empleado.cp,
        RegimenFiscalReceptor: '605', // 605 = Sueldos y Salarios
        UsoCFDI: 'CN01' // CN01 = Nómina
    }).up();

    // Concepto de Nómina Obligatorio
    root.ele('cfdi:Conceptos')
        .ele('cfdi:Concepto', {
            ClaveProdServ: '84111505', // Servicios de contabilidad de sueldos y salarios
            Cantidad: '1',
            ClaveUnidad: 'ACT', // Actividad
            Descripcion: 'Pago de nómina',
            ValorUnitario: datosRecibo.totalPercepciones.toFixed(2),
            Importe: datosRecibo.totalPercepciones.toFixed(2),
            Descuento: datosRecibo.totalDeducciones.toFixed(2),
            ObjetoImp: '01' // No objeto de impuesto
        }).up()
        .up();

    // COMPLEMENTO DE NÓMINA 1.2
    const complemento = root.ele('cfdi:Complemento')
        .ele('nomina12:Nomina', {
            Version: '1.2',
            TipoNomina: 'O', // O = Ordinaria
            FechaPago: datosRecibo.fechaPago.toISOString().split('T')[0],
            FechaInicialPago: datosRecibo.fechaInicialPago.toISOString().split('T')[0],
            FechaFinalPago: datosRecibo.fechaFinalPago.toISOString().split('T')[0],
            NumDiasPagados: datosRecibo.numDiasPagados.toFixed(3),
            TotalPercepciones: datosRecibo.totalPercepciones.toFixed(2),
            TotalDeducciones: datosRecibo.totalDeducciones.toFixed(2),
        });

    // Datos del Empleador dentro del complemento
    complemento.ele('nomina12:Emisor', { RegistroPatronal: process.env.REGISTRO_PATRONAL }).up();

    // Datos del Trabajador dentro del complemento
    complemento.ele('nomina12:Receptor', {
        Curp: empleado.curp,
        NumSeguridadSocial: empleado.nss,
        FechaInicioRelLaboral: empleado.fechaRelacionLaboral.toISOString().split('T')[0],
        Antiguedad: 'P100W', // Se debe calcular en formato ISO8601 (Ej. P100W = 100 semanas)
        TipoContrato: empleado.contrato, // Ej. '01' [cite: 283]
        Sindicalizado: 'No',
        TipoJornada: empleado.tipoJornada, // Ej. '01' [cite: 292]
        TipoRegimen: empleado.regimenContratacion,
        NumEmpleado: empleado.numEmpleado,
        Departamento: empleado.departamento,
        Puesto: empleado.puesto,
        RiesgoPuesto: empleado.riesgoPuesto,
        PeriodicidadPago: empleado.periodicidad, // Ej. '04' [cite: 159]
        SalarioBaseCotApor: empleado.salarioCuotas.toFixed(2),
        SalarioDiarioIntegrado: empleado.salarioCuotas.toFixed(2),
        ClaveEntFed: empleado.estado // Catálogo SAT de Estados
    }).up();

    // AQUI IRÍAN LOS NODOS DE PERCEPCIONES Y DEDUCCIONES (Se deben iterar según la base de datos)
    // ... (Percepciones: Sueldo, Bonos. Deducciones: ISR, IMSS)

    return root.end({ prettyPrint: false });
}