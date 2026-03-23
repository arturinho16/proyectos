import * as soap from 'soap';
import { create } from 'xmlbuilder2';
import { cerToPem, keyToPem, getNoCertificado, getCertificadoBase64, generarSello } from './firmar';

const WSDL_DEMO = 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';
const WSDL_PROD = 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Concepto {
  claveProdServ: string;
  claveUnidad: string;
  unidad: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  importe: number;
  objetoImpuesto: string;
  ivaTasa: number;
  iepsTasa: number;
  ivaImporte: number;
  iepsImporte: number;
}

interface DatosFactura {
  serie: string;
  folio: string;
  fecha: Date;
  lugarExpedicion: string;
  formaPago: string;
  metodoPago: string;
  moneda: string;
  tipoCambio: number;
  condicionesPago?: string | null;
  tipoComprobante: string;
  subtotal: number;
  descuento: number;
  totalIVA: number;
  totalIEPS: number;
  retencionIVA: number;
  retencionISR: number;
  total: number;
  usoCFDI: string;
  conceptos: Concepto[];
  client: {
    rfc: string;
    nombreRazonSocial: string;
    regimenFiscal: string;
    cp: string;
    usoCfdiDefault: string;
  };
}

// ─── Genera el XML CFDI 4.0 sin sellar ───────────────────────────────────────
export function generarXML(
  datos: DatosFactura,
  noCertificado: string,
  certificadoB64: string
): string {
  const fechaStr = datos.fecha.toISOString().slice(0, 19); // 2026-03-19T18:00:00
  const RFC_EMISOR = process.env.CSD_RFC!;
  const REGIMEN_EMISOR = '601'; // Ajusta según tu empresa
  const NOMBRE_EMISOR = 'EMPRESA DEMO SA DE CV'; // Ajusta según tu empresa

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('cfdi:Comprobante', {
      'xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation':
        'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd',
      Version: '4.0',
      Serie: datos.serie,
      Folio: datos.folio,
      Fecha: fechaStr,
      FormaPago: datos.formaPago,
      NoCertificado: noCertificado,
      Certificado: certificadoB64,
      SubTotal: datos.subtotal.toFixed(2),
      ...(datos.descuento > 0 && { Descuento: datos.descuento.toFixed(2) }),
      Moneda: datos.moneda,
      ...(datos.moneda !== 'MXN' && { TipoCambio: datos.tipoCambio.toFixed(6) }),
      Total: datos.total.toFixed(2),
      TipoDeComprobante: datos.tipoComprobante,
      Exportacion: '01',
      MetodoPago: datos.metodoPago,
      LugarExpedicion: datos.lugarExpedicion,
      ...(datos.condicionesPago && { CondicionesDePago: datos.condicionesPago }),
      Sello: '', // Se llenará después
    });

  // Emisor
  root.ele('cfdi:Emisor', {
    Rfc: RFC_EMISOR,
    Nombre: NOMBRE_EMISOR,
    RegimenFiscal: REGIMEN_EMISOR,
  }).up();

  // Receptor
  root.ele('cfdi:Receptor', {
    Rfc: datos.client.rfc,
    Nombre: datos.client.nombreRazonSocial,
    DomicilioFiscalReceptor: datos.client.cp,
    RegimenFiscalReceptor: datos.client.regimenFiscal,
    UsoCFDI: datos.usoCFDI,
  }).up();

  // Conceptos
  const conceptosNode = root.ele('cfdi:Conceptos');
  for (const c of datos.conceptos) {
    const concepto = conceptosNode.ele('cfdi:Concepto', {
      ClaveProdServ: c.claveProdServ,
      Cantidad: Number(c.cantidad).toString(),
      ClaveUnidad: c.claveUnidad,
      Unidad: c.unidad,
      Descripcion: c.descripcion,
      ValorUnitario: Number(c.precioUnitario).toFixed(6),
      Importe: Number(c.importe).toFixed(2),
      ...(c.descuento > 0 && { Descuento: Number(c.descuento).toFixed(2) }),
      ObjetoImp: c.objetoImpuesto,
    });

    if (c.objetoImpuesto !== '01' && (c.ivaImporte > 0 || c.iepsImporte > 0)) {
      const impuestos = concepto.ele('cfdi:Impuestos');
      const traslados = impuestos.ele('cfdi:Traslados');
      if (c.ivaImporte > 0) {
        traslados.ele('cfdi:Traslado', {
          Base: Number(c.importe).toFixed(2),
          Impuesto: '002',
          TipoFactor: 'Tasa',
          TasaOCuota: Number(c.ivaTasa).toFixed(6),
          Importe: Number(c.ivaImporte).toFixed(2),
        }).up();
      }
      if (c.iepsImporte > 0) {
        traslados.ele('cfdi:Traslado', {
          Base: Number(c.importe).toFixed(2),
          Impuesto: '003',
          TipoFactor: 'Tasa',
          TasaOCuota: Number(c.iepsTasa).toFixed(6),
          Importe: Number(c.iepsImporte).toFixed(2),
        }).up();
      }
    }
    concepto.up();
  }
  conceptosNode.up();

  // Impuestos globales
  const impuestosAttr: Record<string, string> = {};
  if (datos.totalIVA > 0) impuestosAttr.TotalImpuestosTrasladados = datos.totalIVA.toFixed(2);
  if (datos.retencionIVA > 0 || datos.retencionISR > 0) {
    impuestosAttr.TotalImpuestosRetenidos = (datos.retencionIVA + datos.retencionISR).toFixed(2);
  }

  const impuestosNode = root.ele('cfdi:Impuestos', impuestosAttr);
  if (datos.totalIVA > 0 || datos.totalIEPS > 0) {
    const trasladosNode = impuestosNode.ele('cfdi:Traslados');
    if (datos.totalIVA > 0) {
      trasladosNode.ele('cfdi:Traslado', {
        Base: datos.subtotal.toFixed(2),
        Impuesto: '002',
        TipoFactor: 'Tasa',
        TasaOCuota: '0.160000',
        Importe: datos.totalIVA.toFixed(2),
      }).up();
    }
  }
  if (datos.retencionIVA > 0 || datos.retencionISR > 0) {
    const retencionesNode = impuestosNode.ele('cfdi:Retenciones');
    if (datos.retencionIVA > 0) {
      retencionesNode.ele('cfdi:Retencion', {
        Impuesto: '002',
        Importe: datos.retencionIVA.toFixed(2),
      }).up();
    }
    if (datos.retencionISR > 0) {
      retencionesNode.ele('cfdi:Retencion', {
        Impuesto: '001',
        Importe: datos.retencionISR.toFixed(2),
      }).up();
    }
  }

  return root.end({ prettyPrint: false });
}

// ─── Genera la cadena original del CFDI 4.0 ──────────────────────────────────
function generarCadenaOriginal(xmlString: string): string {
  // Extraemos atributos del Comprobante para la cadena original
  // Formato SAT: ||Version|...|Sello||  (sin el Sello)
  const getAttr = (attr: string): string => {
    const match = xmlString.match(new RegExp(`${attr}="([^"]+)"`));
    return match ? match[1] : '';
  };

  const campos = [
    getAttr('Version'),
    getAttr('Serie'),
    getAttr('Folio'),
    getAttr('Fecha'),
    getAttr('FormaPago'),
    getAttr('NoCertificado'),
    getAttr('SubTotal'),
    getAttr('Moneda'),
    getAttr('Total'),
    getAttr('TipoDeComprobante'),
    getAttr('Exportacion'),
    getAttr('MetodoPago'),
    getAttr('LugarExpedicion'),
  ].filter(Boolean);

  return `||${campos.join('|')}||`;
}

// ─── Función principal: genera XML firmado y lo timbra con FINKOK ─────────────
export async function timbrarFactura(datos: DatosFactura): Promise<{
  uuid: string;
  xmlTimbrado: string;
  noCertificadoSAT: string;
}> {
  // 1. Leer CSD del .env
  const cerB64 = process.env.CSD_CERTIFICADO_B64!;
  const keyB64 = process.env.CSD_LLAVE_B64!;
  const password = process.env.CSD_PASSWORD!;
  const usuario = process.env.FINKOK_USUARIO!;
  const passwordFinkok = process.env.FINKOK_PASSWORD!;
  const ambiente = process.env.FINKOK_AMBIENTE || 'demo';

  // 2. Preparar certificado
  const noCertificado = getNoCertificado(cerB64);
  const certificadoB64 = getCertificadoBase64(cerB64);
  const keyPem = keyToPem(keyB64, password);

  // 3. Generar XML sin sello
  let xmlSinSello = generarXML(datos, noCertificado, certificadoB64);

  // 4. Generar cadena original y sello
  const cadenaOriginal = generarCadenaOriginal(xmlSinSello);
  const sello = generarSello(cadenaOriginal, keyPem);

  // 5. Insertar sello en el XML
  const xmlFirmado = xmlSinSello.replace('Sello=""', `Sello="${sello}"`);

  // 6. Codificar en Base64 para FINKOK
  const xmlBase64 = Buffer.from(xmlFirmado, 'utf-8').toString('base64');

  // 7. Llamar al SOAP de FINKOK
  const wsdl = ambiente === 'demo' ? WSDL_DEMO : WSDL_PROD;
  const client = await soap.createClientAsync(wsdl);

  const [result] = await client.stampAsync({
    xml: xmlBase64,
    username: usuario,
    password: passwordFinkok,
  });

  const stampResult = result?.stampResult;

  if (!stampResult) throw new Error('FINKOK no devolvió respuesta');

  // CodEstatus 300 = éxito
  if (stampResult.CodEstatus !== '300') {
    const incidencia = stampResult.Incidencias?.Incidencia;
    const mensaje = incidencia?.MensajeIncidencia || stampResult.CodEstatus;
    throw new Error(`Error FINKOK: ${mensaje}`);
  }

  const xmlTimbradoB64 = stampResult.xml;
  const xmlTimbrado = Buffer.from(xmlTimbradoB64, 'base64').toString('utf-8');

  return {
    uuid: stampResult.UUID,
    xmlTimbrado,
    noCertificadoSAT: stampResult.NoCertificadoSAT,
  };
}
