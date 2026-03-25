import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XMLBuilder } from 'fast-xml-parser'
import { createSign, X509Certificate } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'
// @ts-ignore — xslt-processor no tiene tipos oficiales
import { Xslt, XmlParser } from 'xslt-processor'

// ─── Config FINKOK de prueba o demo ────────────────────────────────────────────────────────────
const FINKOK_ENDPOINT =
  process.env.FINKOK_AMBIENTE === 'produccion'
    ? 'https://facturacion.finkok.com/servicios/soap/stamp'
    : 'https://demo-facturacion.finkok.com/servicios/soap/stamp'

const FINKOK_USER = process.env.FINKOK_USUARIO!
const FINKOK_PASS = process.env.FINKOK_PASSWORD!

const CSD_CERT_B64 = process.env.CSD_CERTIFICADO_B64!.replace(/\s+/g, '')
const CSD_KEY_B64 = process.env.CSD_LLAVE_B64!.replace(/\s+/g, '')
const CSD_PASS = process.env.CSD_PASSWORD!
const CSD_RFC = process.env.CSD_RFC!

// ─── Cargar XSLT SAT una sola vez (módulo-level cache) ───────────────────────
const parser = new XmlParser()
const xsltContent = readFileSync(join(process.cwd(), 'src/lib/sat/cadena-original.xslt'), 'utf-8')
const xsltDoc = parser.xmlParse(xsltContent)

// ─── Helpers CSD / Fecha ─────────────────────────────────────────────────────
function derBase64ToPem(base64: string, label: 'CERTIFICATE'): string {
  const clean = base64.replace(/\s+/g, '')
  const body = clean.match(/.{1,64}/g)?.join('\n') ?? clean
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`
}

function getNoCertificado(): string {
  const certPem = derBase64ToPem(CSD_CERT_B64, 'CERTIFICATE')
  const cert = new X509Certificate(certPem)
  const serialHex = cert.serialNumber.replace(/:/g, '').trim()
  const noCertificado = Buffer.from(serialHex, 'hex').toString('ascii').trim()
  if (!/^\d{20}$/.test(noCertificado)) {
    throw new Error(`NoCertificado inválido extraído del CSD: ${noCertificado}`)
  }
  return noCertificado
}

function getFechaCfdi(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const map = Object.fromEntries(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  )
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`
}

// ─── Cadena Original OFICIAL via XSLT SAT ────────────────────────────────────
// ✅ FIX: ahora es async y hace await del xsltProcess
async function buildCadenaOriginal(xmlString: string): Promise<string> {
  const parserLocal = new XmlParser()
  const xmlDoc = parserLocal.xmlParse(xmlString)
  const xslt = new Xslt()

  const result = await xslt.xsltProcess(xmlDoc, xsltDoc)

  // ✅ CFDI cadena original debe ir encerrada con || ... ||
  const inner = String(result ?? '').trim()
  const cadena = `||${inner}||`

  console.log('🔑 Cadena original (XSLT):', cadena)
  return cadena
}

// ─── Sellar con CSD (RSA-SHA256) ──────────────────────────────────────────────
function sellarXML(cadenaOriginal: string): string {
  const keyDer = Buffer.from(CSD_KEY_B64, 'base64')
  const sign = createSign('RSA-SHA256')
  sign.update(cadenaOriginal, 'utf8')
  return sign.sign(
    { key: keyDer, format: 'der', type: 'pkcs8', passphrase: CSD_PASS },
    'base64'
  )
}

// ─── Construir XML CFDI 4.0 SIN sello (para XSLT) ────────────────────────────
function buildXMLSinSello(factura: any, fecha: string, noCertificado: string): string {
  const lugarExpedicion = factura.lugarExpedicion ?? '62964'
  const emisorRfc = CSD_RFC
  const emisorNombre = process.env.EMISOR_NOMBRE ?? 'ESCUELA KEMPER URGATE SA DE CV'
  const emisorRegimen = process.env.EMISOR_REGIMEN ?? '601'
  const receptor = factura.client

  const conceptos = factura.conceptos.map((c: any) => {
    const concepto: any = {
      '@_ClaveProdServ': c.claveProdServ,
      '@_Cantidad': Number(c.cantidad).toString(),
      '@_ClaveUnidad': c.claveUnidad,
      '@_Unidad': c.unidad,
      '@_Descripcion': c.descripcion,
      '@_ValorUnitario': Number(c.precioUnitario).toFixed(6),
      '@_Importe': Number(c.importe).toFixed(6),
      '@_ObjetoImp': c.objetoImpuesto ?? '02',
    }
    const base = Number(c.importe)
    const ivaTasa = Number(c.ivaTasa)
    const iepsTasa = Number(c.iepsTasa)
    const traslados: any[] = []
    if (ivaTasa > 0) {
      traslados.push({
        '@_Base': base.toFixed(6),
        '@_Impuesto': '002',
        '@_TipoFactor': 'Tasa',
        '@_TasaOCuota': ivaTasa.toFixed(6),
        '@_Importe': (base * ivaTasa).toFixed(6),
      })
    }
    if (iepsTasa > 0) {
      traslados.push({
        '@_Base': base.toFixed(6),
        '@_Impuesto': '003',
        '@_TipoFactor': 'Tasa',
        '@_TasaOCuota': iepsTasa.toFixed(6),
        '@_Importe': (base * iepsTasa).toFixed(6),
      })
    }
    if (traslados.length > 0) {
      concepto['cfdi:Impuestos'] = {
        'cfdi:Traslados': { 'cfdi:Traslado': traslados },
      }
    }
    return concepto
  })

  const trasladosAgrupados = factura.conceptos
    .flatMap((c: any) => {
      const base = Number(c.importe)
      const result: any[] = []
      if (Number(c.ivaTasa) > 0)
        result.push({ impuesto: '002', tasa: Number(c.ivaTasa), base, importe: base * Number(c.ivaTasa) })
      if (Number(c.iepsTasa) > 0)
        result.push({ impuesto: '003', tasa: Number(c.iepsTasa), base, importe: base * Number(c.iepsTasa) })
      return result
    })
    .reduce((acc: any[], t: any) => {
      const key = `${t.impuesto}-${t.tasa}`
      const ex = acc.find((x: any) => x._key === key)
      if (ex) {
        ex['@_Importe'] = (parseFloat(ex['@_Importe']) + t.importe).toFixed(6)
        ex['@_Base'] = (parseFloat(ex['@_Base']) + t.base).toFixed(6)
      } else {
        acc.push({
          _key: key,
          '@_Base': t.base.toFixed(6),
          '@_Impuesto': t.impuesto,
          '@_TipoFactor': 'Tasa',
          '@_TasaOCuota': t.tasa.toFixed(6),
          '@_Importe': t.importe.toFixed(6),
        })
      }
      return acc
    }, [])
    .map(({ _key, ...rest }: any) => rest)

  const totalImpuestos = trasladosAgrupados.reduce(
    (s: number, t: any) => s + parseFloat(t['@_Importe']), 0
  )

  const xmlObj = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    'cfdi:Comprobante': {
      '@_xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@_xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd',
      '@_Version': '4.0',
      '@_Serie': factura.serie ?? 'A',
      '@_Folio': String(factura.folio),
      '@_Fecha': fecha,
      '@_Sello': '',
      '@_NoCertificado': noCertificado,
      '@_Certificado': CSD_CERT_B64,
      '@_SubTotal': Number(factura.subtotal).toFixed(2),
      '@_Moneda': factura.moneda ?? 'MXN',
      '@_Total': Number(factura.total).toFixed(2),
      '@_TipoDeComprobante': factura.tipoComprobante ?? 'I',
      '@_Exportacion': '01',
      '@_MetodoPago': factura.metodoPago,
      '@_FormaPago': factura.formaPago,
      '@_LugarExpedicion': lugarExpedicion,
      'cfdi:Emisor': {
        '@_Rfc': emisorRfc,
        '@_Nombre': emisorNombre,
        '@_RegimenFiscal': emisorRegimen,
      },
      'cfdi:Receptor': {
        '@_Rfc': receptor.rfc,
        '@_Nombre': receptor.nombreRazonSocial,
        '@_DomicilioFiscalReceptor': receptor.cp,
        '@_RegimenFiscalReceptor': receptor.regimenFiscal,
        '@_UsoCFDI': factura.usoCFDI,
      },
      'cfdi:Conceptos': { 'cfdi:Concepto': conceptos },
      'cfdi:Impuestos': {
        '@_TotalImpuestosTrasladados': totalImpuestos.toFixed(6),
        'cfdi:Traslados': { 'cfdi:Traslado': trasladosAgrupados },
      },
    },
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: false,
    suppressEmptyNode: true,
    processEntities: false,
  })

  return builder.build(xmlObj)
}

// ─── Construir XML final con sello insertado ──────────────────────────────────
// ✅ FIX: ahora es async porque depende de buildCadenaOriginal async
async function buildXML(factura: any): Promise<string> {
  const fecha = getFechaCfdi()
  const noCertificado = getNoCertificado()

  console.log('🔐 NoCertificado real:', noCertificado)
  console.log('🕒 Fecha CFDI:', fecha)

  const xmlSinSello = buildXMLSinSello(factura, fecha, noCertificado)
  console.log('📄 XML sin sello:\n', xmlSinSello)

  const cadenaOriginal = await buildCadenaOriginal(xmlSinSello)

  const sello = sellarXML(cadenaOriginal)
  console.log('✅ Sello generado:', sello.slice(0, 40) + '...')

  return xmlSinSello.replace('Sello=""', `Sello="${sello}"`)
}

// ─── Llamar a FINKOK stamp ────────────────────────────────────────────────────
async function llamarStamp(xmlBase64: string) {
  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:ns1="http://facturacion.finkok.com/stamp">
  <SOAP-ENV:Body>
    <ns1:stamp>
      <ns1:xml>${xmlBase64}</ns1:xml>
      <ns1:username>${FINKOK_USER}</ns1:username>
      <ns1:password>${FINKOK_PASS}</ns1:password>
    </ns1:stamp>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

  const MAX_INTENTOS = 3
  let lastError: any

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      console.log(`🔄 FINKOK intento ${intento}/${MAX_INTENTOS}`)
      const res = await fetch(FINKOK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: 'stamp',
        },
        body: soapBody,
        signal: AbortSignal.timeout(25000),
      })

      const text = await res.text()
      console.log('📨 FINKOK stamp response:\n', text)

      const uuid = text.match(/<[^:]*:?UUID>([^<]+)<\/[^:]*:?UUID>/i)?.[1]
      const xmlResult = text.match(/<[^:]*:?xml>([^<]*)<\/[^:]*:?xml>/i)?.[1]
      const codEstatus = text.match(/<[^:]*:?CodEstatus>([^<]+)<\/[^:]*:?CodEstatus>/i)?.[1]
      const mensaje = text.match(/<[^:]*:?MensajeIncidencia>([^<]+)<\/[^:]*:?MensajeIncidencia>/i)?.[1]
      const codigo = text.match(/<[^:]*:?CodigoError>([^<]+)<\/[^:]*:?CodigoError>/i)?.[1]

      if (!uuid) {
        return { error: `[${codigo ?? 'ERROR'}] ${mensaje ?? 'Error desconocido'}`, codEstatus }
      }
      return { uuid, xmlTimbrado: xmlResult, codEstatus }
    } catch (err: any) {
      lastError = err
      if (intento < MAX_INTENTOS) {
        console.log(`⚠️ Timeout intento ${intento}, esperando 3s...`)
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
  }

  throw lastError
}

// ─── POST /api/facturas/[id]/timbrar ─────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: facturaId } = await params

    const factura = await prisma.factura.findUnique({
      where: { id: facturaId },
      include: { client: true, conceptos: true },
    })

    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }
    if (factura.uuid) {
      return NextResponse.json({ error: 'Factura ya timbrada', uuid: factura.uuid }, { status: 400 })
    }

    // ✅ FIX: ahora buildXML es async
    const xml = await buildXML(factura)
    console.log('📄 XML sellado:\n', xml)

    const xmlBase64 = Buffer.from(xml, 'utf-8').toString('base64')
    const resultado = await llamarStamp(xmlBase64)

    if (resultado.error) {
      return NextResponse.json({ error: resultado.error, codEstatus: resultado.codEstatus }, { status: 422 })
    }

    const actualizada = await prisma.factura.update({
      where: { id: facturaId },
      data: {
        uuid: resultado.uuid,
        xmlTimbrado: resultado.xmlTimbrado,
        estado: 'TIMBRADA',
      },
    })

    return NextResponse.json({
      ok: true,
      uuid: resultado.uuid,
      codEstatus: resultado.codEstatus,
      factura: actualizada,
    })
  } catch (err: any) {
    console.error('❌ Error timbrado:', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}