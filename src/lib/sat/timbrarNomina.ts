import { create } from 'xmlbuilder2';

const safeDate = (date: any) => {
    if (!date) return '2026-01-01';
    try { return new Date(date).toISOString().split('T')[0]; }
    catch { return '2026-01-01'; }
};

const safeDateTime = (date: any) => {
    if (!date) return '2026-01-01T00:00:00';
    try { return new Date(date).toISOString().split('.')[0]; }
    catch { return '2026-01-01T00:00:00'; }
};

// Evita que Finkok rechace por fechas ilógicas
const calcularAntiguedad = (fechaInicio: string, fechaFinal: string) => {
    try {
        const start = new Date(fechaInicio);
        const end = new Date(fechaFinal);
        if (start > end) return 'P1W';
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let weeks = Math.floor(diffDays / 7);
        if (weeks < 1) weeks = 1;
        return `P${weeks}W`;
    } catch {
        return 'P1W';
    }
};

const parseEstadoNomina = (estadoRaw: string) => {
    if (!estadoRaw) return 'MEX';
    const est = estadoRaw.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (est.length === 3) return est;

    const mapaEstados: Record<string, string> = {
        'AGUASCALIENTES': 'AGU', 'BAJA CALIFORNIA': 'BCN', 'BAJA CALIFORNIA SUR': 'BCS',
        'CAMPECHE': 'CAM', 'COAHUILA': 'COA', 'COLIMA': 'COL', 'CHIAPAS': 'CHP',
        'CHIHUAHUA': 'CHH', 'CIUDAD DE MEXICO': 'CMX', 'CDMX': 'CMX', 'DISTRITO FEDERAL': 'CMX',
        'DURANGO': 'DUR', 'GUANAJUATO': 'GUA', 'GUERRERO': 'GRO', 'HIDALGO': 'HGO',
        'JALISCO': 'JAL', 'ESTADO DE MEXICO': 'MEX', 'EDOMEX': 'MEX', 'MICHOACAN': 'MIC',
        'MORELOS': 'MOR', 'NAYARIT': 'NAY', 'NUEVO LEON': 'NLE', 'OAXACA': 'OAX',
        'PUEBLA': 'PUE', 'QUERETARO': 'QUE', 'QUINTANA ROO': 'ROO', 'SAN LUIS POTOSI': 'SLP',
        'SINALOA': 'SIN', 'SONORA': 'SON', 'TABASCO': 'TAB', 'TAMAULIPAS': 'TAM',
        'TLAXCALA': 'TLA', 'VERACRUZ': 'VER', 'YUCATAN': 'YUC', 'ZACATECAS': 'ZAC'
    };
    return mapaEstados[est] || 'MEX';
};

export function generarXMLNomina(
    datosRecibo: any,
    empleado: any,
    noCertificado: string,
    certificadoB64: string
): string {
    const folioCorto = datosRecibo.id ? String(datosRecibo.id).split('-')[0] : '001';
    const emisorCP = process.env.EMISOR_CP || '62964';

    // SAT exige cero dobles espacios
    const nombreLimpio = `${empleado.nombre} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno || ''}`
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, ' ').trim().toUpperCase();

    const rfcReceptor = empleado.rfc || 'XAXX010101000';
    const cpReceptor = (rfcReceptor === 'XAXX010101000' || rfcReceptor === 'XEXX010101000') ? emisorCP : (empleado.cp || emisorCP);

    const fInicioLab = safeDate(empleado.fechaRelacionLaboral);
    const fFinalPago = safeDate(datosRecibo.fechaFinalPago);
    const antiguedadDinamica = calcularAntiguedad(fInicioLab, fFinalPago);

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
            LugarExpedicion: emisorCP,
        });

    root.ele('cfdi:Emisor', {
        Rfc: process.env.EMISOR_RFC || 'EKU9003173C9',
        Nombre: process.env.EMISOR_NOMBRE || 'ESCUELA KEMPER URATE',
        RegimenFiscal: process.env.EMISOR_REGIMEN_FISCAL || '601'
    }).up();

    root.ele('cfdi:Receptor', {
        Rfc: rfcReceptor,
        Nombre: nombreLimpio,
        DomicilioFiscalReceptor: cpReceptor,
        RegimenFiscalReceptor: '605',
        UsoCFDI: 'CN01'
    }).up();

    root.ele('cfdi:Conceptos')
        .ele('cfdi:Concepto', {
            ClaveProdServ: '84111505', Cantidad: '1', ClaveUnidad: 'ACT',
            Descripcion: 'Pago de nómina', ValorUnitario: datosRecibo.totalPercepciones.toFixed(2),
            Importe: datosRecibo.totalPercepciones.toFixed(2),
            Descuento: datosRecibo.totalDeducciones > 0 ? datosRecibo.totalDeducciones.toFixed(2) : undefined,
            ObjetoImp: '01'
        }).up()
        .up();

    const complemento = root.ele('cfdi:Complemento')
        .ele('nomina12:Nomina', {
            Version: '1.2', TipoNomina: 'O',
            FechaPago: safeDate(datosRecibo.fechaPago),
            FechaInicialPago: safeDate(datosRecibo.fechaInicialPago),
            FechaFinalPago: fFinalPago,
            NumDiasPagados: Number(datosRecibo.numDiasPagados).toFixed(3),
            TotalPercepciones: datosRecibo.totalPercepciones > 0 ? datosRecibo.totalPercepciones.toFixed(2) : undefined,
            TotalDeducciones: datosRecibo.totalDeducciones > 0 ? datosRecibo.totalDeducciones.toFixed(2) : undefined,
        });

    const tipoRegimen = empleado.regimenContratacion || '02';
    const esAsimilado = ['05', '06', '07', '08', '09', '10', '11'].includes(tipoRegimen);

    const emisorNominaNode = complemento.ele('nomina12:Emisor');
    if (!esAsimilado) {
        emisorNominaNode.att('RegistroPatronal', process.env.REGISTRO_PATRONAL || 'B7032191100');
    }
    emisorNominaNode.up();

    const curpValida = (empleado.curp && empleado.curp.length === 18) ? empleado.curp.toUpperCase() : 'XAXX010101000AXXXX';

    const receptorAtributos: any = {
        Curp: curpValida,
        FechaInicioRelLaboral: fInicioLab,
        Antiguedad: antiguedadDinamica,
        TipoContrato: empleado.contrato || '01',
        Sindicalizado: 'No', TipoJornada: empleado.tipoJornada || '01',
        TipoRegimen: tipoRegimen, NumEmpleado: empleado.numEmpleado || '001',
        Departamento: empleado.departamento || 'General', Puesto: empleado.puesto || 'Empleado',
        PeriodicidadPago: empleado.periodicidad || '04',
        ClaveEntFed: parseEstadoNomina(empleado.estado || 'MEX')
    };

    if (!esAsimilado) {
        receptorAtributos.NumSeguridadSocial = empleado.nss || '12345678901';
        receptorAtributos.RiesgoPuesto = empleado.riesgoPuesto || '1';
        receptorAtributos.SalarioBaseCotApor = Number(empleado.salarioCuotas || 250).toFixed(2);
        receptorAtributos.SalarioDiarioIntegrado = Number(empleado.salarioCuotas || 250).toFixed(2);
    }

    complemento.ele('nomina12:Receptor', receptorAtributos).up();

    if (datosRecibo.percepciones && datosRecibo.percepciones.length > 0) {
        let totalSueldos = 0; let totalGravado = 0; let totalExento = 0;
        datosRecibo.percepciones.forEach((p: any) => {
            totalGravado += Number(p.importeGravado);
            totalExento += Number(p.importeExento);
            totalSueldos += (Number(p.importeGravado) + Number(p.importeExento));
        });

        const percepcionesNode = complemento.ele('nomina12:Percepciones', {
            TotalSueldos: totalSueldos.toFixed(2), TotalGravado: totalGravado.toFixed(2), TotalExento: totalExento.toFixed(2)
        });

        datosRecibo.percepciones.forEach((p: any) => {
            percepcionesNode.ele('nomina12:Percepcion', {
                TipoPercepcion: p.tipoPercepcion, Clave: p.clave, Concepto: p.concepto,
                ImporteGravado: Number(p.importeGravado).toFixed(2), ImporteExento: Number(p.importeExento).toFixed(2)
            }).up();
        });
        percepcionesNode.up();
    }

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
                TipoDeduccion: d.tipoDeduccion, Clave: d.clave, Concepto: d.concepto, Importe: Number(d.importe).toFixed(2)
            }).up();
        });
        deduccionesNode.up();
    }

    // EL SUBSIDIO FANTASMA (Obligatorio para que Finkok no marque error de estructura)
    if (tipoRegimen === '02') {
        const otrosPagosNode = complemento.ele('nomina12:OtrosPagos');
        const otroPagoNode = otrosPagosNode.ele('nomina12:OtroPago', {
            TipoOtroPago: '002',
            Clave: 'OP-002',
            Concepto: 'Subsidio para el empleo (efectivamente entregado al trabajador)',
            Importe: '0.00'
        });
        otroPagoNode.ele('nomina12:SubsidioAlEmpleo', {
            SubsidioCausado: '0.00'
        }).up();
        otroPagoNode.up();
        otrosPagosNode.up();
    }

    return root.end({ prettyPrint: false });
}