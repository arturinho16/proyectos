import * as soap from 'soap';
import { create } from 'xmlbuilder2';
import { readFileSync } from 'fs';
import { join } from 'path';
// @ts-ignore
import { Xslt, XmlParser } from 'xslt-processor';
import { keyToPem, getNoCertificado, getCertificadoBase64, generarSello } from './firmar';

const WSDL_DEMO = 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';
const WSDL_PROD = 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl';

const xsltPath = join(process.cwd(), 'src/lib/sat/cadena-original.xslt');
const xsltContent = readFileSync(xsltPath, 'utf8');

export interface Concepto {
  noIdentificacion?: string | null;
  claveProdServ: string; claveUnidad: string; unidad: string; descripcion: string;
  cantidad: number; precioUnitario: number; descuento: number; importe: number;
  objetoImpuesto: string; ivaTasa: number; iepsTasa: number; ivaImporte: number; iepsImporte: number;
}

export interface DatosFactura {
  serie: string; folio: string; fecha: Date; lugarExpedicion: string;
  formaPago: string; metodoPago: string; moneda: string; tipoCambio: number;
  condicionesPago?: string | null; tipoComprobante: string; subtotal: number;
  descuento: number; totalIVA: number; totalIEPS: number; retencionIVA: number;
  retencionISR: number; total: number; usoCFDI: string; conceptos: Concepto[];
  client: { rfc: string; nombreRazonSocial: string; regimenFiscal: string; cp: string; };
  esGlobal?: boolean; periodicidad?: string | null; mes?: string | null; anio?: number | null;
}

function formatFechaCfdi(date: Date): string {
  const d = new Date(date);
  const options = { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false } as const;
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(d);
  const map = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
}

export function generarXMLUnsigned(datos: DatosFactura, noCertificado: string, certificadoB64: string): string {
  const fechaStr = formatFechaCfdi(datos.fecha);
  const RFC_EMISOR = process.env.EMISOR_RFC || 'XAXX010101000';
  const REGIMEN_EMISOR = process.env.EMISOR_REGIMEN_FISCAL || '601';
  const NOMBRE_EMISOR = process.env.EMISOR_NOMBRE || 'EMPRESA DEMO';

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('cfdi:Comprobante', {
      'xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd',
      Version: '4.0',
      Serie: datos.serie.trim(),
      Folio: datos.folio.trim(),
      Fecha: fechaStr,
      Sello: '',
      FormaPago: datos.formaPago.trim(),
      NoCertificado: noCertificado,
      Certificado: certificadoB64,
      SubTotal: datos.subtotal.toFixed(2),
      ...(datos.descuento > 0 && { Descuento: datos.descuento.toFixed(2) }),
      Moneda: datos.moneda.trim(),
      ...(datos.moneda !== 'MXN' && { TipoCambio: datos.tipoCambio.toFixed(6) }),
      Total: datos.total.toFixed(2),
      TipoDeComprobante: datos.tipoComprobante.trim(),
      Exportacion: '01',
      MetodoPago: datos.metodoPago.trim(),
      LugarExpedicion: datos.lugarExpedicion.trim(),
      ...(datos.condicionesPago && { CondicionesDePago: datos.condicionesPago.trim() }),
    });

  if (datos.esGlobal && datos.periodicidad && datos.mes && datos.anio) {
    root.ele('cfdi:InformacionGlobal', {
      Periodicidad: datos.periodicidad.trim(),
      Meses: datos.mes.trim(),
      Año: datos.anio.toString().trim(),
    }).up();
  }

  root.ele('cfdi:Emisor', { Rfc: RFC_EMISOR.trim(), Nombre: NOMBRE_EMISOR.trim(), RegimenFiscal: REGIMEN_EMISOR.trim() }).up();
  root.ele('cfdi:Receptor', { Rfc: datos.client.rfc.trim(), Nombre: datos.client.nombreRazonSocial.trim(), DomicilioFiscalReceptor: datos.client.cp.trim(), RegimenFiscalReceptor: datos.client.regimenFiscal.trim(), UsoCFDI: datos.usoCFDI.trim() }).up();

  const conceptosNode = root.ele('cfdi:Conceptos');
  for (const c of datos.conceptos) {
    const baseParaImpuestos = (c.importe - c.descuento).toFixed(2);

    const conceptoAttrs: Record<string, string> = {
      ClaveProdServ: c.claveProdServ.trim(),
      Cantidad: Number(c.cantidad).toString(),
      ClaveUnidad: c.claveUnidad.trim(),
      Unidad: c.unidad.trim(),
      Descripcion: c.descripcion.trim(),
      ValorUnitario: Number(c.precioUnitario).toFixed(6),
      Importe: Number(c.importe).toFixed(2),
      ObjetoImp: c.objetoImpuesto.trim(),
    };

    if (c.noIdentificacion && c.noIdentificacion.trim() !== '') {
      conceptoAttrs.NoIdentificacion = c.noIdentificacion.trim();
    }
    if (c.descuento > 0) conceptoAttrs.Descuento = Number(c.descuento).toFixed(2);

    const concepto = conceptosNode.ele('cfdi:Concepto', conceptoAttrs);

    if (c.objetoImpuesto.trim() !== '01' && (c.ivaImporte > 0 || c.iepsImporte > 0)) {
      const traslados = concepto.ele('cfdi:Impuestos').ele('cfdi:Traslados');
      if (c.ivaImporte > 0) traslados.ele('cfdi:Traslado', { Base: baseParaImpuestos, Impuesto: '002', TipoFactor: 'Tasa', TasaOCuota: Number(c.ivaTasa).toFixed(6), Importe: Number(c.ivaImporte).toFixed(2) }).up();
      if (c.iepsImporte > 0) traslados.ele('cfdi:Traslado', { Base: baseParaImpuestos, Impuesto: '003', TipoFactor: 'Tasa', TasaOCuota: Number(c.iepsTasa).toFixed(6), Importe: Number(c.iepsImporte).toFixed(2) }).up();
    }
    concepto.up();
  }
  conceptosNode.up();

  const impuestosAttr: Record<string, string> = {};
  if (datos.totalIVA > 0) impuestosAttr.TotalImpuestosTrasladados = datos.totalIVA.toFixed(2);
  if (datos.retencionIVA > 0 || datos.retencionISR > 0) impuestosAttr.TotalImpuestosRetenidos = (datos.retencionIVA + datos.retencionISR).toFixed(2);

  const baseGlobal = (datos.subtotal - datos.descuento).toFixed(2);
  if (Object.keys(impuestosAttr).length > 0) {
    const impuestosNode = root.ele('cfdi:Impuestos', impuestosAttr);
    if (datos.totalIVA > 0 || datos.totalIEPS > 0) {
      const trasladosNode = impuestosNode.ele('cfdi:Traslados');
      if (datos.totalIVA > 0) trasladosNode.ele('cfdi:Traslado', { Base: baseGlobal, Impuesto: '002', TipoFactor: 'Tasa', TasaOCuota: '0.160000', Importe: datos.totalIVA.toFixed(2) }).up();
    }
  }

  return root.end({ prettyPrint: false });
}

export async function buildCadenaOriginal(xmlString: string): Promise<string> {
  const xslt = new Xslt();
  const parser = new XmlParser();

  const xmlSafe = xmlString.replace(/Año="/g, 'Anio="');
  const xsltSafe = xsltContent.replace(/@A&#241;o/g, '@Anio').replace(/@Año/g, '@Anio');

  const xmlDoc = parser.xmlParse(xmlSafe);
  const xsltDoc = parser.xmlParse(xsltSafe);
  const result = await xslt.xsltProcess(xmlDoc, xsltDoc);

  let cadena = result.toString();
  cadena = cadena.replace(/[\r\n\t]/g, '').trim();

  // 🛡️ PARCHE INFALIBLE PARA FACTURA GLOBAL
  if (xmlString.includes('cfdi:InformacionGlobal')) {
    const matchPer = xmlString.match(/Periodicidad="([^"]+)"/);
    const matchMes = xmlString.match(/Meses="([^"]+)"/);
    const matchAnio = xmlString.match(/Año="([^"]+)"/);
    const matchLugar = xmlString.match(/LugarExpedicion="([^"]+)"/);
    const matchRfc = xmlString.match(/cfdi:Emisor[^>]*Rfc="([^"]+)"/);

    if (matchPer && matchMes && matchAnio && matchLugar && matchRfc) {
      const per = matchPer[1];
      const mes = matchMes[1];
      const anio = matchAnio[1];
      const lugar = matchLugar[1];
      const rfc = matchRfc[1];

      const seqCorrecta = `|${per}|${mes}|${anio}|`;

      // Si la cadena no tiene la información global...
      if (!cadena.includes(seqCorrecta)) {
        // Buscamos exactamente donde el XSLT unió el CP (LugarExpedicion) con el RFC
        const seqOmitida = `|${lugar}|${rfc}|`;

        if (cadena.includes(seqOmitida)) {
          // Inyectamos la información global justo en medio (CP -> Global -> RFC)
          cadena = cadena.replace(seqOmitida, `|${lugar}|${per}|${mes}|${anio}|${rfc}|`);
        } else {
          // Fallbacks adicionales por si acaso
          const seqMala1 = `|${per}|${mes}||`;
          const seqMala2 = `|${per}|${mes}|${rfc}|`;

          if (cadena.includes(seqMala1)) {
            cadena = cadena.replace(seqMala1, seqCorrecta);
          } else if (cadena.includes(seqMala2)) {
            cadena = cadena.replace(seqMala2, `|${per}|${mes}|${anio}|${rfc}|`);
          }
        }
      }
    }
  }

  // Asegurar los pipes de inicio y fin requeridos por el estándar
  if (!cadena.startsWith('||')) cadena = '||' + cadena.replace(/^\|+/, '');
  cadena = cadena.replace(/\|+$/, '') + '||';

  return cadena;
}

export async function timbrarFactura(datos: DatosFactura): Promise<{ uuid: string; xmlTimbrado: string; noCertificadoSAT: string; }> {
  const cerB64 = process.env.CSD_CERTIFICADO_B64!;
  const keyB64 = process.env.CSD_LLAVE_B64!;
  const password = process.env.CSD_PASSWORD!;
  const usuario = process.env.FINKOK_USUARIO || process.env.FINKOK_USER!;
  const passwordFinkok = process.env.FINKOK_PASSWORD!;
  const ambiente = process.env.FINKOK_AMBIENTE || 'demo';

  const noCertificado = getNoCertificado(cerB64);
  const certificadoB64 = getCertificadoBase64(cerB64);
  const keyPem = keyToPem(keyB64, password);

  const xmlSinSello = generarXMLUnsigned(datos, noCertificado, certificadoB64);
  const cadenaOriginal = await buildCadenaOriginal(xmlSinSello);
  const sello = generarSello(cadenaOriginal, keyPem);
  const xmlFirmado = xmlSinSello.replace('Sello=""', `Sello="${sello}"`);

  {/*
  console.log("\n==========================================");
  console.log("🔍 MODO INSPECTOR: DATOS ANTES DE FINKOK");
  console.log("==========================================");
  console.log("🔗 CADENA ORIGINAL:\n", cadenaOriginal);
  console.log("------------------------------------------");
  console.log("📄 XML QUE SE ENVIARÁ AL SAT:\n", xmlFirmado);
  console.log("==========================================\n");
  */}
  const wsdl = ambiente === 'demo' ? WSDL_DEMO : WSDL_PROD;
  const client = await soap.createClientAsync(wsdl);
  const xmlBase64 = Buffer.from(xmlFirmado, 'utf-8').toString('base64');

  const [result] = await client.stampAsync({ xml: xmlBase64, username: usuario, password: passwordFinkok });
  const stampResult = result?.stampResult;

  if (!stampResult) throw new Error('FINKOK no devolvió respuesta');

  if (!stampResult.UUID) {
    const incidencias = stampResult.Incidencias?.Incidencia;
    const incidencia = Array.isArray(incidencias) ? incidencias[0] : incidencias;
    throw new Error(`Error FINKOK: ${incidencia?.MensajeIncidencia || stampResult.CodEstatus || 'Error desconocido'}`);
  }

  return { uuid: stampResult.UUID, xmlTimbrado: Buffer.from(stampResult.xml, 'base64').toString('utf-8'), noCertificadoSAT: stampResult.NoCertificadoSAT };
}