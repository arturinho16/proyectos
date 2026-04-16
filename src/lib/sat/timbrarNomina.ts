import { create } from 'xmlbuilder2';

export function generarXMLNomina(
    datosRecibo: any,
    empleado: any,
    noCertificado: string,
    certificadoB64: string
): string {
    // 1. NODO PRINCIPAL (Comprobante)
    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('cfdi:Comprobante', {
            'xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
            'xmlns:nomina12': 'http://www.sat.gob.mx/nomina12',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            'xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd',
            Version: '4.0',
            Serie: 'NOM',
            Folio: datosRecibo.id.split('-')[0], // Folio acortado
            Fecha: datosRecibo.fechaPago.toISOString().split('.')[0], // Formato SAT
            Sello: '',
            NoCertificado: noCertificado,
            Certificado: certificadoB64,
            SubTotal: datosRecibo.totalPercepciones.toFixed(2),
            Descuento: datosRecibo.totalDeducciones > 0 ? datosRecibo.totalDeducciones.toFixed(2) : undefined,
            Moneda: 'MXN',
            Total: datosRecibo.totalNeto.toFixed(2),
            TipoDeComprobante: 'N', // N = Nómina
            Exportacion: '01',
            MetodoPago: 'PUE',
            LugarExpedicion: process.env.EMISOR_CP || '00000',
        });

    // 2. EMISOR Y RECEPTOR DEL CFDI
    root.ele('cfdi:Emisor', {
        Rfc: process.env.EMISOR_RFC || 'EKU9003173C9', // Default a CSD de prueba SAT
        Nombre: process.env.EMISOR_NOMBRE || 'EMPRESA DE PRUEBA',
        RegimenFiscal: process.env.EMISOR_REGIMEN_FISCAL || '601'
    }).up();

    root.ele('cfdi:Receptor', {
        Rfc: empleado.rfc,
        Nombre: `${empleado.nombre} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno || ''}`.trim().toUpperCase(),
        DomicilioFiscalReceptor: empleado.cp,
        RegimenFiscalReceptor: '605', // 605 = Sueldos y Salarios
        UsoCFDI: 'CN01' // CN01 = Nómina
    }).up();

    // 3. CONCEPTO REQUERIDO POR EL SAT PARA NÓMINA
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
            TipoNomina: 'O', // O = Ordinaria
            FechaPago: datosRecibo.fechaPago.toISOString().split('T')[0],
            FechaInicialPago: datosRecibo.fechaInicialPago.toISOString().split('T')[0],
            FechaFinalPago: datosRecibo.fechaFinalPago.toISOString().split('T')[0],
            NumDiasPagados: Number(datosRecibo.numDiasPagados).toFixed(3),
            TotalPercepciones: datosRecibo.totalPercepciones > 0 ? datosRecibo.totalPercepciones.toFixed(2) : undefined,
            TotalDeducciones: datosRecibo.totalDeducciones > 0 ? datosRecibo.totalDeducciones.toFixed(2) : undefined,
            // TotalOtrosPagos iría aquí si lo manejas
        });

    complemento.ele('nomina12:Emisor', {
        RegistroPatronal: process.env.REGISTRO_PATRONAL || '00000000000'
    }).up();

    complemento.ele('nomina12:Receptor', {
        Curp: empleado.curp,
        NumSeguridadSocial: empleado.nss,
        FechaInicioRelLaboral: empleado.fechaRelacionLaboral.toISOString().split('T')[0],
        Antiguedad: 'P100W', // OJO: Debes calcular esto en ISO8601 real (Ej. semanas trabajadas)
        TipoContrato: empleado.contrato,
        Sindicalizado: 'No',
        TipoJornada: empleado.tipoJornada,
        TipoRegimen: empleado.regimenContratacion,
        NumEmpleado: empleado.numEmpleado,
        Departamento: empleado.departamento || 'General',
        Puesto: empleado.puesto || 'Empleado',
        RiesgoPuesto: empleado.riesgoPuesto || '1',
        PeriodicidadPago: empleado.periodicidad,
        SalarioBaseCotApor: Number(empleado.salarioCuotas).toFixed(2),
        SalarioDiarioIntegrado: Number(empleado.salarioCuotas).toFixed(2),
        ClaveEntFed: empleado.estado || 'MEX' // Clave SAT del estado
    }).up();

    // 5. NODO PERCEPCIONES (Iteración Dinámica)
    if (datosRecibo.percepciones && datosRecibo.percepciones.length > 0) {
        let totalSueldos = 0;
        let totalGravado = 0;
        let totalExento = 0;

        // Sumatoria estricta
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

    // 6. NODO DEDUCCIONES (Clasificación obligatoria del SAT)
    if (datosRecibo.deducciones && datosRecibo.deducciones.length > 0) {
        let totalImpuestosRetenidos = 0;
        let totalOtrasDeducciones = 0;

        datosRecibo.deducciones.forEach((d: any) => {
            if (d.tipoDeduccion === '002') { // 002 = ISR
                totalImpuestosRetenidos += Number(d.importe);
            } else {
                totalOtrasDeducciones += Number(d.importe);
            }
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