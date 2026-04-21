import { create } from 'xmlbuilder2';

type Empleado = {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  curp: string;
  rfc: string;
  nss?: string | null;
  fechaRelacionLaboral: Date;
  contrato: string;
  tipoJornada: string;
  regimenContratacion: string;
  numEmpleado: string;
  departamento?: string | null;
  puesto?: string | null;
  periodicidad: string;
  estado?: string | null;
  riesgoPuesto?: string | null;
  salarioCuotas?: number | null;
};

type Recibo = {
  id: string;
  fechaPago: Date;
  fechaInicialPago: Date;
  fechaFinalPago: Date;
  numDiasPagados: number;
  totalPercepciones: number;
  totalDeducciones: number;
  totalOtrosPagos?: number;
  totalNeto: number;
  percepciones: Array<{ tipoPercepcion: string; clave: string; concepto: string; importeGravado: number; importeExento: number }>;
  deducciones: Array<{ tipoDeduccion: string; clave: string; concepto: string; importe: number }>;
};

const estadoMap: Record<string, string> = {
  AGUASCALIENTES: 'AGU',
  BAJA_CALIFORNIA: 'BCN',
  BAJA_CALIFORNIA_SUR: 'BCS',
  CAMPECHE: 'CAM',
  CHIAPAS: 'CHP',
  CHIHUAHUA: 'CHH',
  COAHUILA: 'COA',
  COLIMA: 'COL',
  CIUDAD_DE_MEXICO: 'CMX',
  CDMX: 'CMX',
  DISTRITO_FEDERAL: 'CMX',
  DURANGO: 'DUR',
  GUANAJUATO: 'GUA',
  GUERRERO: 'GRO',
  HIDALGO: 'HID',
  JALISCO: 'JAL',
  ESTADO_DE_MEXICO: 'MEX',
  MICHOACAN: 'MIC',
  MORELOS: 'MOR',
  NAYARIT: 'NAY',
  NUEVO_LEON: 'NLE',
  OAXACA: 'OAX',
  PUEBLA: 'PUE',
  QUERETARO: 'QUE',
  QUINTANA_ROO: 'ROO',
  SAN_LUIS_POTOSI: 'SLP',
  SINALOA: 'SIN',
  SONORA: 'SON',
  TABASCO: 'TAB',
  TAMAULIPAS: 'TAM',
  TLAXCALA: 'TLA',
  VERACRUZ: 'VER',
  YUCATAN: 'YUC',
  ZACATECAS: 'ZAC',
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function formatDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

function formatDateTime(d: Date): string {
  return new Date(d).toISOString().slice(0, 19);
}

function calcularAntiguedad(fechaInicio: Date, fechaFinal: Date): string {
  const diffMs = Math.max(1, new Date(fechaFinal).getTime() - new Date(fechaInicio).getTime());
  const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return `P${days}D`;
}

function claveEntidad(estado?: string | null): string {
  if (!estado) return 'CMX';
  const key = normalizeText(estado).replace(/\s/g, '_');
  return estadoMap[key] ?? 'CMX';
}

export function generarXMLNomina(recibo: Recibo, empleado: Empleado, noCertificado: string, certificadoB64: string) {
  const emisorRfc = process.env.EMISOR_RFC ?? '';
  const emisorNombre = normalizeText(process.env.EMISOR_NOMBRE ?? 'EMISOR SIN NOMBRE');
  const emisorRegimen = process.env.EMISOR_REGIMEN_FISCAL ?? '601';
  const emisorCP = process.env.EMISOR_CP ?? '00000';

  const nombreEmpleado = normalizeText(`${empleado.nombre} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno ?? ''}`);

  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('cfdi:Comprobante', {
    'xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
    'xmlns:nomina12': 'http://www.sat.gob.mx/nomina12',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:schemaLocation':
      'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd',
    Version: '4.0',
    Serie: 'NOM',
    Folio: recibo.id.slice(0, 8).toUpperCase(),
    Fecha: formatDateTime(recibo.fechaPago),
    Sello: 'PENDIENTE_SELLO',
    NoCertificado: noCertificado,
    Certificado: certificadoB64,
    SubTotal: recibo.totalPercepciones.toFixed(2),
    Descuento: recibo.totalDeducciones > 0 ? recibo.totalDeducciones.toFixed(2) : undefined,
    Moneda: 'MXN',
    Total: recibo.totalNeto.toFixed(2),
    TipoDeComprobante: 'N',
    Exportacion: '01',
    MetodoPago: 'PUE',
    LugarExpedicion: emisorCP,
  });

  root.ele('cfdi:Emisor', {
    Rfc: emisorRfc,
    Nombre: emisorNombre,
    RegimenFiscal: emisorRegimen,
  });

  root.ele('cfdi:Receptor', {
    Rfc: empleado.rfc,
    Nombre: nombreEmpleado,
    DomicilioFiscalReceptor: emisorCP,
    RegimenFiscalReceptor: '605',
    UsoCFDI: 'CN01',
  });

  root.ele('cfdi:Conceptos').ele('cfdi:Concepto', {
    ClaveProdServ: '84111505',
    Cantidad: '1',
    ClaveUnidad: 'ACT',
    Descripcion: 'Pago de nomina',
    ValorUnitario: recibo.totalPercepciones.toFixed(2),
    Importe: recibo.totalPercepciones.toFixed(2),
    Descuento: recibo.totalDeducciones > 0 ? recibo.totalDeducciones.toFixed(2) : undefined,
    ObjetoImp: '01',
  });

  const nomina = root.ele('cfdi:Complemento').ele('nomina12:Nomina', {
    Version: '1.2',
    TipoNomina: 'O',
    FechaPago: formatDate(recibo.fechaPago),
    FechaInicialPago: formatDate(recibo.fechaInicialPago),
    FechaFinalPago: formatDate(recibo.fechaFinalPago),
    NumDiasPagados: recibo.numDiasPagados.toFixed(3),
    TotalPercepciones: recibo.totalPercepciones.toFixed(2),
    TotalDeducciones: recibo.totalDeducciones > 0 ? recibo.totalDeducciones.toFixed(2) : undefined,
    TotalOtrosPagos: (recibo.totalOtrosPagos ?? 0) > 0 ? (recibo.totalOtrosPagos ?? 0).toFixed(2) : undefined,
  });

  nomina.ele('nomina12:Emisor', {
    RegistroPatronal: process.env.REGISTRO_PATRONAL ?? 'B7032191100',
  });

  nomina.ele('nomina12:Receptor', {
    Curp: empleado.curp,
    FechaInicioRelLaboral: formatDate(empleado.fechaRelacionLaboral),
    'Antigüedad': calcularAntiguedad(empleado.fechaRelacionLaboral, recibo.fechaFinalPago),
    TipoContrato: empleado.contrato,
    Sindicalizado: 'No',
    TipoJornada: empleado.tipoJornada,
    TipoRegimen: empleado.regimenContratacion,
    NumEmpleado: empleado.numEmpleado,
    Departamento: empleado.departamento ?? 'General',
    Puesto: empleado.puesto ?? 'Empleado',
    PeriodicidadPago: empleado.periodicidad,
    ClaveEntFed: claveEntidad(empleado.estado),
    NumSeguridadSocial: empleado.nss ?? '00000000000',
    RiesgoPuesto: empleado.riesgoPuesto ?? '1',
    SalarioBaseCotApor: Number(empleado.salarioCuotas ?? 0).toFixed(2),
    SalarioDiarioIntegrado: Number(empleado.salarioCuotas ?? 0).toFixed(2),
  });

  const percepcionesNode = nomina.ele('nomina12:Percepciones', {
    TotalSueldos: recibo.totalPercepciones.toFixed(2),
    TotalGravado: recibo.percepciones.reduce((a, p) => a + p.importeGravado, 0).toFixed(2),
    TotalExento: recibo.percepciones.reduce((a, p) => a + p.importeExento, 0).toFixed(2),
  });

  recibo.percepciones.forEach((p) => {
    percepcionesNode.ele('nomina12:Percepcion', {
      TipoPercepcion: p.tipoPercepcion,
      Clave: p.clave,
      Concepto: p.concepto,
      ImporteGravado: p.importeGravado.toFixed(2),
      ImporteExento: p.importeExento.toFixed(2),
    });
  });

  if (recibo.deducciones.length) {
    const totalISR = recibo.deducciones.filter((d) => d.tipoDeduccion === '002').reduce((a, d) => a + d.importe, 0);
    const totalOtras = recibo.deducciones.filter((d) => d.tipoDeduccion !== '002').reduce((a, d) => a + d.importe, 0);

    const deduccionesNode = nomina.ele('nomina12:Deducciones', {
      TotalImpuestosRetenidos: totalISR > 0 ? totalISR.toFixed(2) : undefined,
      TotalOtrasDeducciones: totalOtras > 0 ? totalOtras.toFixed(2) : undefined,
    });

    recibo.deducciones.forEach((d) => {
      deduccionesNode.ele('nomina12:Deduccion', {
        TipoDeduccion: d.tipoDeduccion,
        Clave: d.clave,
        Concepto: d.concepto,
        Importe: d.importe.toFixed(2),
      });
    });
  }

  return root.end({ prettyPrint: false });
}
