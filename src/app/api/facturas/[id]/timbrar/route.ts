import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XMLBuilder } from 'fast-xml-parser'
import { createSign, X509Certificate } from 'crypto'

// ─── Config FINKOK ────────────────────────────────────────────────────────────
const FINKOK_ENDPOINT =
  process.env.FINKOK_AMBIENTE === 'produccion'
    ? 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl'
    : 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl'

const FINKOK_USER = process.env.FINKOK_USUARIO!
const FINKOK_PASS = process.env.FINKOK_PASSWORD!

const CSD_CERT_B64 = process.env.CSD_CERTIFICADO_B64!
const CSD_KEY_B64 = process.env.CSD_LLAVE_B64!
const CSD_PASS = process.env.CSD_PASSWORD!
const CSD_RFC = process.env.CSD_RFC!

// ─── Extraer NoCertificado del CSD ───────────────────────────────────────────
function getNoCertificado(): string {
  try {
    const certDer = Buffer.from(CSD_CERT_B64, 'base64')
    const cert = new X509Certificate(certDer)
    return cert.serialNumber.replace(/\s/g, '').padStart(20, '0')
  } catch {
    return process.env.CSD_NO_CERTIFICADO ?? '300010000500003416'
  }
}

// ─── Cadena Original CFDI 4.0 ────────────────────────────────────────────────
function buildCadenaOriginal(c: Record<string, any>): string {
  const partes = [
    c.Version,
    c.Serie ?? '',
    c.Folio,
    c.Fecha,
    c.SubTotal,
    c.Descuento ?? '',
    c.Moneda,
    c.Total,
    c.TipoDeComprobante,
    c.Exportacion,
    c.MetodoPago ?? '',
    c.FormaPago ?? '',
    c.LugarExpedicion,
    c.emisorRfc,
    c.emisorNombre,
    c.emisorRegimen,
    c.receptorRfc,
    c.receptorNombre,
    c.receptorDomicilio,
    c.receptorRegimen,
    c.receptorUsoCFDI,
  ]
  return `||${partes.join('|')}||`
}

// ─── Sellar con CSD (RSA-SHA256) ──────────────────────────────────────────────
function sellarXML(cadenaOriginal: string): string {
  const keyDer = Buffer.from(CSD_KEY_B64, 'base64')
  const sign = createSign('RSA-SHA256')
  sign.update(cadenaOriginal, 'utf8')
  return sign.sign({ key: keyDer, format: 'der', type: 'pkcs8', passphrase: CSD_PASS }, 'base64')
}

// ─── Construir XML CFDI 4.0 sellado ──────────────────────────────────────────
function buildXML(factura: any): string {
  const fecha = new Date().toISOString().slice(0, 19)

  // Emisor — viene del .env (no hay tabla Emisor en el schema)
  const emisorRfc = CSD_RFC
  const emisorNombre = process.env.EMISOR_NOMBRE ?? 'ESCUELA KEMPER URGATE SA DE CV'
  const emisorRegimen = process.env.EMISOR_REGIMEN ?? '601'

  // Receptor — es factura.client (relación real en el schema)
  const receptor = factura.client

  const cadenaData = {
    Version: '4.0',
    Serie: factura.serie ?? 'A',
    Folio: String(factura.folio),
    Fecha: fecha,
    SubTotal: Number(factura.subtotal).toFixed(2),
    Descuento: factura.descuento ? Number(factura.descuento).toFixed(2) : '',
    Moneda: factura.moneda ?? 'MXN',
    Total: Number(factura.total).toFixed(2),
    TipoDeComprobante: factura.tipoComprobante ?? 'I',
    Exportacion: '01',
    MetodoPago: factura.metodoPago,
    FormaPago: factura.formaPago,
    LugarExpedicion: factura.lugarExpedicion,
    emisorRfc,
    emisorNombre,
    emisorRegimen,
    receptorRfc: receptor.rfc,
    receptorNombre: receptor.nombreRazonSocial,
    receptorDomicilio: receptor.cp,
    receptorRegimen: receptor.regimenFiscal,
    receptorUsoCFDI: factura.usoCFDI,
  }

  const cadenaOriginal = buildCadenaOriginal(cadenaData)
  console.log('🔑 Cadena original:', cadenaOriginal)

  const sello = sellarXML(cadenaOriginal)
  console.log('✅ Sello generado:', sello.slice(0, 40) + '...')

  // Construir conceptos con impuestos calculados desde ivaTasa/iepsTasa
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

  // Totales de impuestos agrupados
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
      '@_Sello': sello,
      '@_NoCertificado': getNoCertificado(),
      '@_Certificado': CSD_CERT_B64,
      '@_SubTotal': Number(factura.subtotal).toFixed(2),
      '@_Moneda': factura.moneda ?? 'MXN',
      '@_Total': Number(factura.total).toFixed(2),
      '@_TipoDeComprobante': factura.tipoComprobante ?? 'I',
      '@_Exportacion': '01',
      '@_MetodoPago': factura.metodoPago,
      '@_FormaPago': factura.formaPago,
      '@_LugarExpedicion': factura.lugarExpedicion,
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

  const res = await fetch(FINKOK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: '"http://facturacion.finkok.com/stamp/stamp"',
    },
    body: soapBody,
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
      include: {
        client: true,      // ← relación real en el schema
        conceptos: true,   // ← sin include de traslados (no existe esa tabla)
      },
    })

    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }
    if (factura.uuid) {
      return NextResponse.json({ error: 'Factura ya timbrada', uuid: factura.uuid }, { status: 400 })
    }

    const xml = buildXML(factura)
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

    return NextResponse.json({ ok: true, uuid: resultado.uuid, codEstatus: resultado.codEstatus, factura: actualizada })
  } catch (err: any) {
    console.error('❌ Error timbrado:', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}