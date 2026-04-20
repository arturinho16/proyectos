import { create } from 'xmlbuilder2';

// Helpers para proteger las fechas y evitar errores de 'split'
const safeDate = (date: any) => {
    if (!date) return '2026-01-01'; // Fecha de rescate si viene vacía
    try { return new Date(date).toISOString().split('T')[0]; }
    catch { return '2026-01-01'; }
};

const safeDateTime = (date: any) => {
    if (!date) return '2026-01-01T00:00:00';
    try { return new Date(date).toISOString().split('.')[0]; }
    catch { return '2026-01-01T00:00:00'; }
};

export function generarXMLNomina(
    datosRecibo: any,
    empleado: any,
    noCertificado: string,
    certificadoB64: string
): string {
    const folioCorto = datosRecibo.id ? String(datosRecibo.id).split('-')[0] : '001';

    // 1. NODO PRINCIPAL (Comprobante)
    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('cfdi:Comprobante', {
            'xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
            'xmlns:nomina12': 'http://www.sat.gob.mx/nomina12',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            'xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd',
            Version: '4.0',
            Serie: 'NOM',
            Folio: folioCorto.toUpperCase(),
            Fecha: safeDateTime(datosRecibo.fechaPago),
            Sello: '___SELLO_AQUI___',
            NoCertificado: noCertificado,
            Certificado: certificadoB64,
            SubTotal: datosRecibo.totalPercepciones.toFixed(2),
            Descuento: datosRecibo.totalDeducciones > 0 ? datosRecibo.totalDeducciones.toFixed(2) : undefined,
            Moneda: 'MXN',
            Total: datosRecibo.totalNeto.toFixed(2),
            TipoDeComprobante: 'N',
            Exportacion: '01',
            MetodoPago: 'PUE',
            LugarExpedicion: process.env.EMISOR_CP || '00000',
        });

    // 2. EMISOR Y RECEPTOR
    root.ele('cfdi:Emisor', {
        Rfc: process.env.EMISOR_RFC || 'EKU9003173C9',
        Nombre: process.env.EMISOR_NOMBRE || 'EMPRESA DE PRUEBA',
        RegimenFiscal: process.env.EMISOR_REGIMEN_FISCAL || '601'
    }).up();

    root.ele('cfdi:Receptor', {
        Rfc: empleado.rfc || 'XAXX010101000',
        Nombre: `${empleado.nombre} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno || ''}`.trim().toUpperCase(),
        DomicilioFiscalReceptor: empleado.cp || process.env.EMISOR_CP || '00000',
        RegimenFiscalReceptor: '605',
        UsoCFDI: 'CN01'
    }).up();

    // 3. CONCEPTO
    root.ele('cfdi:Conceptos')
        .ele('cfdi:Concepto', {
            ClaveProdServ: '84111505',
            Cantidad: '1',
            ClaveUnidad: 'ACT',
            Descripcion: 'Pago de nómina',
            ValorUnitario: datosRecibo.totalPercepciones.toFixed(2),
            Importe: datosRecibo.totalPercepciones.toFixed(2),
            Descuento: datosRecibo.totalDeducciones > 0 ? datosRecibo.totalDeducciones.toFixed(2) : undefined,
            ObjetoImp: '01'
        }).up()
        .up();

    // 4. COMPLEMENTO DE NÓMINA 1.2
    const complemento = root.ele('cfdi:Complemento')
        .ele('nomina12:Nomina', {
            Version: '1.2',
            TipoNomina: 'O',
            FechaPago: safeDate(datosRecibo.fechaPago),
            FechaInicialPago: safeDate(datosRecibo.fechaInicialPago),
            FechaFinalPago: safeDate(datosRecibo.fechaFinalPago),
            NumDiasPagados: Number(datosRecibo.numDiasPagados).toFixed(3),
            TotalPercepciones: datosRecibo.totalPercepciones > 0 ? datosRecibo.totalPercepciones.toFixed(2) : undefined,
            TotalDeducciones: datosRecibo.totalDeducciones > 0 ? datosRecibo.totalDeducciones.toFixed(2) : undefined,
        });

    complemento.ele('nomina12:Emisor', {
        RegistroPatronal: process.env.REGISTRO_PATRONAL || '00000000000'
    }).up();

    complemento.ele('nomina12:Receptor', {
        Curp: empleado.curp || 'MOCK00000000000000',
        NumSeguridadSocial: empleado.nss || '00000000000',
        FechaInicioRelLaboral: safeDate(empleado.fechaRelacionLaboral),
        Antiguedad: 'P100W',
        TipoContrato: empleado.contrato || '01',
        Sindicalizado: 'No',
        TipoJornada: empleado.tipoJornada || '01',
        TipoRegimen: empleado.regimenContratacion || '02',
        NumEmpleado: empleado.numEmpleado || '001',
        Departamento: empleado.departamento || 'General',
        Puesto: empleado.puesto || 'Empleado',
        RiesgoPuesto: empleado.riesgoPuesto || '1',
        PeriodicidadPago: empleado.periodicidad || '04',
        SalarioBaseCotApor: Number(empleado.salarioCuotas || 250).toFixed(2),
        SalarioDiarioIntegrado: Number(empleado.salarioCuotas || 250).toFixed(2),
        ClaveEntFed: empleado.estado || 'MEX'
    }).up();

    // 5. PERCEPCIONES
    if (datosRecibo.percepciones && datosRecibo.percepciones.length > 0) {
        let totalSueldos = 0; let totalGravado = 0; let totalExento = 0;

        datosRecibo.percepciones.forEach((p: any) => {
            totalGravado += Number(p.importeGravado);
            totalExento += Number(p.importeExento);
            totalSueldos += (Number(p.importeGravado) + Number(p.importeExento));
        });

        const percepcionesNode = complemento.ele('nomina12:Percepciones', {
            TotalSueldos: totalSueldos.toFixed(2),
            TotalGravado: totalGravado.toFixed(2),
            TotalExento: totalExento.toFixed(2)
        });

        datosRecibo.percepciones.forEach((p: any) => {
            percepcionesNode.ele('nomina12:Percepcion', {
                TipoPercepcion: p.tipoPercepcion,
                Clave: p.clave,
                Concepto: p.concepto,
                ImporteGravado: Number(p.importeGravado).toFixed(2),
                ImporteExento: Number(p.importeExento).toFixed(2)
            }).up();
        });
        percepcionesNode.up();
    }

    // 6. DEDUCCIONES
    if (datosRecibo.deducciones && datosRecibo.deducciones.length > 0) {
        let totalImpuestosRetenidos = 0; let totalOtrasDeducciones = 0;

        datosRecibo.deducciones.forEach((d: any) => {
            if (d.tipoDeduccion === '002') totalImpuestosRetenidos += Number(d.importe);
            else totalOtrasDeducciones += Number(d.importe);
        });

        const atributosDeducciones: any = {};
        if (totalImpuestosRetenidos > 0) atributosDeducciones.TotalImpuestosRetenidos = totalImpuestosRetenidos.toFixed(2);
        if (totalOtrasDeducciones > 0) atributosDeducciones.TotalOtrasDeducciones = totalOtrasDeducciones.toFixed(2);

        const deduccionesNode = complemento.ele('nomina12:Deducciones', atributosDeducciones);

        datosRecibo.deducciones.forEach((d: any) => {
            deduccionesNode.ele('nomina12:Deduccion', {
                TipoDeduccion: d.tipoDeduccion,
                Clave: d.clave,
                Concepto: d.concepto,
                Importe: Number(d.importe).toFixed(2)
            }).up();
        });
        deduccionesNode.up();
    }

    return root.end({ prettyPrint: false });
}