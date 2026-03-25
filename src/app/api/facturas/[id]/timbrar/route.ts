import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XMLBuilder } from 'fast-xml-parser'
import { createSign, X509Certificate } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'

// @ts-ignore
import { Xslt, XmlParser } from 'xslt-processor'

// Carga XSLT una sola vez
const xsltPath = join(process.cwd(), 'src/lib/sat/cadena-original.xslt')
const xsltContent = readFileSync(xsltPath, 'utf8')

function formatFechaCfdi(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }

  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date)
  const p = (type: string) => parts.find((x) => x.type === type)?.value
  return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}:${p('second')}`
}

// 2 decimales (MXN importes finales)
function fmt2(n: unknown): string {
  const num = typeof n === 'number' ? n : Number(n ?? 0)
  const fixed = Number(num).toFixed(2)
  return fixed === '-0.00' ? '0.00' : fixed
}

// 6 decimales (cantidad y unitarios)
function fmt6(n: unknown): string {
  const num = typeof n === 'number' ? n : Number(n ?? 0)
  const fixed = Number(num).toFixed(6)
  return fixed === '-0.000000' ? '0.000000' : fixed
}

async function buildCadenaOriginal(xml: string): Promise<string> {
  const xslt = new Xslt()
  const xmlParser = new XmlParser()
  const out = await xslt.xsltProcess(xmlParser.parseXmlString(xml), xsltContent)
  return out.toString().trim()
}

function getNoCertificadoFromB64(certB64: string): string {
  const certDer = Buffer.from(certB64, 'base64')
  const x509 = new X509Certificate(certDer)
  const serialHex = x509.serialNumber
  const bytes = serialHex.match(/.{2}/g) ?? []
  const ascii = bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join('')
  const digits = ascii.replace(/[^0-9]/g, '')
  return digits || ascii
}

function signCadenaOriginal(cadena: string): string {
  const keyB64 = (process.env.CSD_LLAVE_B64 || '').replace(/\s/g, '')
  if (!keyB64) throw new Error('Falta CSD_LLAVE_B64 en .env')

  const keyDer = Buffer.from(keyB64, 'base64')
  const sign = createSign('RSA-SHA256')
  sign.update(cadena, 'utf8')
  sign.end()
  return sign.sign({ key: keyDer, format: 'der', type: 'pkcs8' }, 'base64')
}

function injectSello(xml: string, sello: string): string {
  return xml.replace('Sello=""', `Sello="${sello}"`)
}

function buildXmlUnsigned(factura: any): string {
  const certB64 = (process.env.CSD_CERTIFICADO_B64 || '').replace(/\s/g, '')
  if (!certB64) throw new Error('Falta CSD_CERTIFICADO_B64 en .env')

  const noCertificado = getNoCertificadoFromB64(certB64)

  // Emisor por .env (porque tu Factura no tiene tabla Emisor)
  const emisorRfc = process.env.EMISOR_RFC || ''
  const emisorNombre = process.env.EMISOR_NOMBRE || ''
  const emisorRegimen = process.env.EMISOR_REGIMEN_FISCAL || ''
  if (!emisorRfc || !emisorNombre || !emisorRegimen) {
    throw new Error('Faltan EMISOR_RFC / EMISOR_NOMBRE / EMISOR_REGIMEN_FISCAL en .env')
  }

  const receptor = factura.client
  if (!receptor) throw new Error('Factura sin receptor (client)')

  const conceptos = factura.conceptos || []
  if (!Array.isArray(conceptos) || conceptos.length === 0) throw new Error('Factura sin conceptos')

  const moneda = factura.moneda || 'MXN'

  // NOTA: Este route aplica regla de Finkok para MXN (2 decimales en importes).
  // Si timbras USD u otra moneda, hay reglas diferentes; se puede extender por catálogo.
  if (moneda === 'MXN') {
    // OK: 2 decimales en totales ya vienen como Decimal(15,2) en Prisma
  }

  const xmlObj: any = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    'cfdi:Comprobante': {
      '@_xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@_xsi:schemaLocation':
        'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd',

      '@_Version': '4.0',
      '@_Serie': factura.serie,
      '@_Folio': factura.folio,
      '@_Fecha': formatFechaCfdi(new Date()),
      '@_Sello': '',

      '@_FormaPago': factura.formaPago,
      '@_NoCertificado': noCertificado,
      '@_Certificado': certB64,

      '@_CondicionesDePago': factura.condicionesPago || undefined,

      '@_SubTotal': fmt2(factura.subtotal),
      '@_Descuento': Number(factura.descuento) > 0 ? fmt2(factura.descuento) : undefined,

      '@_Moneda': moneda,
      '@_TipoCambio': moneda !== 'MXN' ? fmt6(factura.tipoCambio) : undefined,

      '@_Total': fmt2(factura.total),

      '@_TipoDeComprobante': factura.tipoComprobante || 'I',
      '@_Exportacion': '01',
      '@_MetodoPago': factura.metodoPago,
      '@_LugarExpedicion': factura.lugarExpedicion,

      'cfdi:Emisor': {
        '@_Rfc': emisorRfc,
        '@_Nombre': emisorNombre,
        '@_RegimenFiscal': emisorRegimen,
      },

      'cfdi:Receptor': {
        // Ajusta estos nombres si tu model Client difiere
        '@_Rfc': receptor.rfc,
        '@_Nombre': receptor.nombre,
        '@_DomicilioFiscalReceptor': receptor.codigoPostal,
        '@_RegimenFiscalReceptor': receptor.regimenFiscal,
        '@_UsoCFDI': factura.usoCFDI,
      },

      'cfdi:Conceptos': {
        'cfdi:Concepto': conceptos.map((c: any) => {
          const cantidad = c.cantidad // Decimal(15,6)
          const precioUnitario = c.precioUnitario // Decimal(15,6)
          const descuento = c.descuento // Decimal(15,2)
          const importe = c.importe // Decimal(15,2)

          const ivaImporte = c.ivaImporte // Decimal(15,2)
          const iepsImporte = c.iepsImporte // Decimal(15,2)

          // Base para traslados normalmente = Importe del concepto (ya neto de descuento).
          // Finkok te pidió Base a 2 decimales (para MXN).
          const base = importe

          const traslados: any[] = []

          if (Number(ivaImporte) > 0) {
            traslados.push({
              '@_Base': fmt2(base),
              '@_Impuesto': '002',
              '@_TipoFactor': 'Tasa',
              '@_TasaOCuota': Number(c.ivaTasa).toFixed(6), // ej 0.160000
              '@_Importe': fmt2(ivaImporte),
            })
          }

          if (Number(iepsImporte) > 0) {
            // IEPS Impuesto 003
            traslados.push({
              '@_Base': fmt2(base),
              '@_Impuesto': '003',
              '@_TipoFactor': 'Tasa',
              '@_TasaOCuota': Number(c.iepsTasa).toFixed(6),
              '@_Importe': fmt2(iepsImporte),
            })
          }

          return {
            '@_ClaveProdServ': c.claveProdServ,
            '@_Cantidad': fmt6(cantidad),
            '@_ClaveUnidad': c.claveUnidad,
            '@_Unidad': c.unidad,
            '@_Descripcion': c.descripcion,
            '@_ValorUnitario': fmt6(precioUnitario),
            '@_Importe': fmt2(importe),
            '@_Descuento': Number(descuento) > 0 ? fmt2(descuento) : undefined,
            '@_ObjetoImp': c.objetoImpuesto || '02',

            'cfdi:Impuestos':
              traslados.length > 0
                ? {
                  'cfdi:Traslados': {
                    'cfdi:Traslado': traslados.length === 1 ? traslados[0] : traslados,
                  },
                }
                : undefined,
          }
        }),
      },

      // Impuestos globales (suma)
      'cfdi:Impuestos':
        Number(factura.totalIVA) > 0 || Number(factura.totalIEPS) > 0
          ? {
            '@_TotalImpuestosTrasladados': fmt2(Number(factura.totalIVA) + Number(factura.totalIEPS)),
            'cfdi:Traslados': {
              'cfdi:Traslado': (() => {
                const arr: any[] = []

                if (Number(factura.totalIVA) > 0) {
                  arr.push({
                    '@_Base': fmt2(factura.subtotal),
                    '@_Impuesto': '002',
                    '@_TipoFactor': 'Tasa',
                    '@_TasaOCuota': '0.160000',
                    '@_Importe': fmt2(factura.totalIVA),
                  })
                }

                if (Number(factura.totalIEPS) > 0) {
                  arr.push({
                    '@_Base': fmt2(factura.subtotal),
                    '@_Impuesto': '003',
                    '@_TipoFactor': 'Tasa',
                    // si manejas distintas tasas IEPS por concepto, esto habría que agregarse por tasa.
                    '@_TasaOCuota': '0.000000',
                    '@_Importe': fmt2(factura.totalIEPS),
                  })
                }

                return arr.length === 1 ? arr[0] : arr
              })(),
            },
          }
          : undefined,
    },
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    suppressEmptyNode: true,
  })

  return builder.build(xmlObj)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Falta id en la URL' }, { status: 400 })

    const factura = await prisma.factura.findUnique({
      where: { id },
      include: {
        client: true,
        conceptos: true,
      },
    })

    if (!factura) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (factura.estado === 'TIMBRADO') {
      return NextResponse.json({ error: 'Factura ya timbrada' }, { status: 400 })
    }

    const xmlUnsigned = buildXmlUnsigned(factura)

    const cadena = await buildCadenaOriginal(xmlUnsigned)
    console.log('🔑 Cadena original (XSLT):', cadena)

    const sello = signCadenaOriginal(cadena)
    console.log('✅ Sello (primeros 60):', sello.slice(0, 60))

    const xmlSigned = injectSello(xmlUnsigned, sello)

    const stampUrl = process.env.FINKOK_STAMP_URL
    const user = process.env.FINKOK_USER
    const pass = process.env.FINKOK_PASSWORD
    if (!stampUrl || !user || !pass) {
      return NextResponse.json(
        { error: 'Faltan FINKOK_STAMP_URL / FINKOK_USER / FINKOK_PASSWORD en .env' },
        { status: 500 }
      )
    }

    const soapBody = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:stam="http://facturacion.finkok.com/stamp">
  <soapenv:Header/>
  <soapenv:Body>
    <stam:stamp>
      <stam:xml>${Buffer.from(xmlSigned, 'utf8').toString('base64')}</stam:xml>
      <stam:username>${user}</stam:username>
      <stam:password>${pass}</stam:password>
    </stam:stamp>
  </soapenv:Body>
</soapenv:Envelope>`.trim()

    const resp = await fetch(stampUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: soapBody,
    })

    const respText = await resp.text()
    console.log('📨 Finkok response:', respText)

    // Si contiene error, lo devolvemos con 422
    if (/CodigoError|Incidencia|Error/i.test(respText)) {
      return NextResponse.json(
        {
          error: respText,
          xmlEnviado: xmlSigned,
          cadenaOriginal: cadena,
        },
        { status: 422 }
      )
    }

    // Aquí normalmente parseas para extraer UUID y XML timbrado y guardas:
    // await prisma.factura.update({ where:{id}, data:{ estado:'TIMBRADO', uuid, xmlTimbrado } })

    return NextResponse.json({ success: true, xmlEnviado: xmlSigned, finkok: respText })
  } catch (e: any) {
    console.error('❌ timbrar error:', e)
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}