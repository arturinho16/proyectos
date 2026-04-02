import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

// Función VITAL para React-PDF: Corta strings largos (como Base64) para que no se salgan de la hoja
const chunkString = (str?: string) => {
  if (!str) return '';
  return str.match(/.{1,70}/g)?.join('\u200B') || str; // \u200B es un espacio de ancho cero
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: { fontSize: 10, padding: 36, fontFamily: 'Helvetica', color: '#1a1a1a', backgroundColor: '#ffffff' },
  watermark: { position: 'absolute', top: '38%', left: '10%', fontSize: 80, color: '#e5e7eb', opacity: 0.5, fontFamily: 'Helvetica-Bold', transform: 'rotate(-35deg)' },
  headerRow: { flexDirection: 'row', marginBottom: 14, gap: 12 },
  logoBox: { width: 90, alignItems: 'center', justifyContent: 'flex-start' },
  logo: { width: 88, height: 88, objectFit: 'contain' },
  emisorBox: { flex: 1, paddingLeft: 8 },
  receptorBox: { flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#e5e7eb' },
  facturaLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#dc2626', letterSpacing: 1, marginBottom: 4 },
  folioLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#dc2626', letterSpacing: 1, marginBottom: 4, textAlign: 'right' },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', marginBottom: 3, textTransform: 'uppercase' },
  bold: { fontFamily: 'Helvetica-Bold' },
  lineText: { marginBottom: 2, fontSize: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 8 },
  cfdiRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  cfdiCell: { flex: 1 },
  cfdiLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 1 },
  cfdiValue: { fontSize: 7, color: '#374151' },
  exportRow: { flexDirection: 'row', marginBottom: 6 },
  exportLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#374151', width: 70 },
  exportValue: { fontSize: 7, color: '#374151' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingBottom: 4, marginBottom: 2, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', paddingVertical: 5 },
  cProd: { width: '10%' }, cCant: { width: '8%' }, cUnidad: { width: '10%' }, cDesc: { flex: 1 }, cPrecio: { width: '12%', textAlign: 'right' }, cImporte: { width: '12%', textAlign: 'right' },
  conceptoSub: { fontSize: 6.5, color: '#6b7280', marginTop: 2 },
  conceptoSubBold: { fontSize: 6.5, color: '#374151', fontFamily: 'Helvetica-Bold' },
  totalesSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalesBox: { width: 200 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  totalLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151' },
  totalValue: { fontSize: 8, color: '#374151', textAlign: 'right' },
  totalFinalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, marginTop: 2 },
  totalFinalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  totalFinalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  letraRow: { flexDirection: 'row', marginTop: 6, alignItems: 'center' },
  letraLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', width: 60 },
  letraValue: { fontSize: 7, flex: 1, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  monedaRow: { flexDirection: 'row', marginTop: 4 },
  monedaLabel: { fontSize: 7, color: '#6b7280', width: 60 },
  monedaValue: { fontSize: 7, color: '#6b7280' },

  sellosContainer: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: '#1a1a1a', paddingTop: 8 },
  qrBox: { width: 90, alignItems: 'center', justifyContent: 'flex-start' },
  qrImage: { width: 85, height: 85 },
  sellosInfoBox: { flex: 1, paddingLeft: 10 },
  sellosTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 2 },
  sellosText: { fontSize: 5.5, color: '#4b5563', marginBottom: 6, lineHeight: 1.3 },
  footer: { marginTop: 10, fontSize: 7.5, color: '#9ca3af', textAlign: 'center', borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 6 },
});

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Concepto { claveProdServ: string; cantidad: number; claveUnidad: string; unidad?: string; descripcion: string; valorUnitario: number; importe: number; descuento?: number; objetoImpuesto?: string; ivaTasa?: number; iepsImporte?: number; noIdentificacion?: string; }
interface FacturaPDFProps {
  factura: {
    folio: string; serie?: string; fecha: string; estado: string; uuid?: string;
    qrCodeUrl?: string; cadenaOriginal?: string; selloCfdi?: string; selloSat?: string; noCertificado?: string; noCertificadoSat?: string; fechaTimbrado?: string; rfcPac?: string;
    emisor: { nombre: string; rfc: string; direccion?: string; cp?: string; regimenFiscal?: string; telefono?: string; };
    receptor: { nombre: string; rfc: string; direccion?: string; cp?: string; usoCfdi?: string; regimenFiscal?: string; };
    conceptos: Concepto[]; subtotal: number; iva: number; total: number; moneda?: string; formaPago?: string; metodoPago?: string; exportacion?: string; totalLetra?: string;
  };
  logoUrl?: string;
}

export const FacturaPDF: React.FC<FacturaPDFProps> = ({ factura, logoUrl }) => {
  const esBorrador = factura.estado === 'BORRADOR';
  const serie = factura.serie ?? '';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {esBorrador && <Text style={styles.watermark}>BORRADOR</Text>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={styles.facturaLabel}>FACTURA</Text>
          <Text style={styles.folioLabel}>FOLIO:{'   '}{serie}{factura.folio}</Text>
        </View>

        <View style={styles.headerRow}>
          <View style={styles.logoBox}>{logoUrl && <Image src={logoUrl} style={styles.logo} />}</View>
          <View style={styles.emisorBox}>
            <Text style={styles.sectionLabel}>Emisor:</Text>
            <Text style={[styles.bold, styles.lineText]}>{factura.emisor.nombre}</Text>
            <Text style={styles.lineText}>{factura.emisor.rfc}</Text>
            {factura.emisor.direccion && <Text style={styles.lineText}>{factura.emisor.direccion}</Text>}
            {factura.emisor.cp && <Text style={styles.lineText}>Lugar de Expedición: {factura.emisor.cp}</Text>}
            {factura.emisor.regimenFiscal && <Text style={styles.lineText}>Régimen Fiscal: {factura.emisor.regimenFiscal}</Text>}
            <Text style={styles.lineText}>Efecto del comprobante: I - Ingreso</Text>
          </View>
          <View style={styles.receptorBox}>
            <Text style={styles.sectionLabel}>Receptor:</Text>
            <Text style={[styles.bold, styles.lineText]}>{factura.receptor.nombre}</Text>
            <Text style={styles.lineText}>{factura.receptor.rfc}</Text>
            {factura.receptor.direccion && <Text style={styles.lineText}>{factura.receptor.direccion}</Text>}
            {factura.receptor.cp && <View style={{ flexDirection: 'row', marginBottom: 2 }}><Text style={[styles.bold, { fontSize: 8 }]}>Código postal: </Text><Text style={{ fontSize: 8 }}>{factura.receptor.cp}</Text></View>}
            {factura.receptor.usoCfdi && <View style={{ flexDirection: 'row', marginBottom: 2 }}><Text style={[styles.bold, { fontSize: 8 }]}>Uso del CFDI: </Text><Text style={{ fontSize: 8 }}>{factura.receptor.usoCfdi}</Text></View>}
            {factura.receptor.regimenFiscal && <View style={{ flexDirection: 'row', marginBottom: 2 }}><Text style={[styles.bold, { fontSize: 8 }]}>Regimen Fiscal: </Text><Text style={{ fontSize: 8 }}>{factura.receptor.regimenFiscal}</Text></View>}
          </View>
        </View>

        <View style={styles.divider} />

        {(factura.uuid || factura.fecha || factura.noCertificado) && (
          <View style={styles.cfdiRow}>
            {factura.uuid && <View style={styles.cfdiCell}><Text style={styles.cfdiLabel}>Folio Fiscal:</Text><Text style={styles.cfdiValue}>{factura.uuid}</Text></View>}
            <View style={styles.cfdiCell}><Text style={styles.cfdiLabel}>Fecha / Hora de Emisión:</Text><Text style={styles.cfdiValue}>{factura.fecha}</Text></View>
            {factura.noCertificado && <View style={styles.cfdiCell}><Text style={styles.cfdiLabel}>No. de Certificado Digital:</Text><Text style={styles.cfdiValue}>{factura.noCertificado}</Text></View>}
          </View>
        )}

        <View style={styles.exportRow}><Text style={styles.exportLabel}>Exportacion:</Text><Text style={styles.exportValue}>{factura.exportacion ?? '01 - No aplica'}</Text></View>
        <View style={styles.divider} />

        <View style={styles.tableHeader}>
          <Text style={styles.cProd}>Producto</Text><Text style={styles.cCant}>Cantidad</Text><Text style={styles.cUnidad}>Unidad</Text><Text style={styles.cDesc}>Concepto(s)</Text><Text style={styles.cPrecio}>Precio U</Text><Text style={styles.cImporte}>Importe</Text>
        </View>

        {factura.conceptos.map((c, i) => {
          const ivaImporte = c.ivaTasa != null ? c.importe * c.ivaTasa : factura.iva / factura.conceptos.length;
          const objetoLabel = c.objetoImpuesto === '01' ? '01 - Sin objeto de impuesto' : '02 - Con objeto de impuesto';
          return (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cProd}>{c.claveProdServ}</Text><Text style={styles.cCant}>{c.cantidad}</Text><Text style={styles.cUnidad}>{c.claveUnidad}{c.unidad ? ` - ${c.unidad}` : ''}</Text>
              <View style={styles.cDesc}>
                <Text>{c.descripcion}</Text><Text style={styles.conceptoSub}>{objetoLabel}</Text>
                {c.noIdentificacion && <View style={{ flexDirection: 'row' }}><Text style={styles.conceptoSubBold}>No Identificación: </Text><Text style={styles.conceptoSub}>{c.noIdentificacion}</Text></View>}
                {c.objetoImpuesto !== '01' && <View><Text style={styles.conceptoSubBold}>Traslados:</Text><Text style={styles.conceptoSub}>IVA: 002, Base: {fmt(c.importe)}, Tasa: {(c.ivaTasa ?? 0.16).toFixed(6)}, Importe: {fmt(ivaImporte)}</Text></View>}
              </View>
              <Text style={styles.cPrecio}>{fmt(c.valorUnitario)}</Text><Text style={styles.cImporte}>{fmt(c.importe)}</Text>
            </View>
          );
        })}

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <View style={styles.monedaRow}><Text style={styles.monedaLabel}>Moneda:</Text><Text style={styles.monedaValue}>{factura.moneda ?? 'MXN - Peso Mexicano'}</Text></View>
            {factura.totalLetra && <View style={styles.letraRow}><Text style={styles.letraLabel}>Monto con letra:</Text><Text style={styles.letraValue}>{factura.totalLetra}</Text></View>}
            {factura.formaPago && <View style={styles.monedaRow}><Text style={styles.monedaLabel}>Forma Pago:</Text><Text style={styles.monedaValue}>{factura.formaPago}</Text></View>}
            {factura.metodoPago && <View style={styles.monedaRow}><Text style={styles.monedaLabel}>Método Pago:</Text><Text style={styles.monedaValue}>{factura.metodoPago}</Text></View>}
          </View>
          <View style={styles.totalesBox}>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal:</Text><Text style={styles.totalValue}>{fmt(factura.subtotal)}</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>IVA 16%:</Text><Text style={styles.totalValue}>{fmt(factura.iva)}</Text></View>
            <View style={styles.totalFinalRow}><Text style={styles.totalFinalLabel}>Total:</Text><Text style={styles.totalFinalValue}>{fmt(factura.total)}</Text></View>
          </View>
        </View>

        {/* ── SELLOS Y QR ── */}
        {!esBorrador && factura.uuid && (
          <View style={styles.sellosContainer}>
            <View style={styles.qrBox}>
              {factura.qrCodeUrl && <Image src={factura.qrCodeUrl} style={styles.qrImage} />}
            </View>

            <View style={styles.sellosInfoBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                {factura.fechaTimbrado && <View><Text style={styles.sellosTitle}>Fecha / Hora de Certificación:</Text><Text style={styles.sellosText}>{factura.fechaTimbrado}</Text></View>}
                {factura.noCertificadoSat && <View><Text style={styles.sellosTitle}>Número de Serie Certificado del SAT:</Text><Text style={styles.sellosText}>{factura.noCertificadoSat}</Text></View>}
                {factura.rfcPac && <View><Text style={styles.sellosTitle}>RFC del PAC:</Text><Text style={styles.sellosText}>{factura.rfcPac}</Text></View>}
              </View>

              {factura.cadenaOriginal && (
                <>
                  <Text style={styles.sellosTitle}>Cadena Original del complemento de Certificación Digital del SAT:</Text>
                  <Text style={styles.sellosText}>{chunkString(factura.cadenaOriginal)}</Text>
                </>
              )}
              {factura.selloCfdi && (
                <>
                  <Text style={styles.sellosTitle}>Sello Digital del CFDI:</Text>
                  <Text style={styles.sellosText}>{chunkString(factura.selloCfdi)}</Text>
                </>
              )}
              {factura.selloSat && (
                <>
                  <Text style={styles.sellosTitle}>Sello Digital del SAT:</Text>
                  <Text style={styles.sellosText}>{chunkString(factura.selloSat)}</Text>
                </>
              )}
            </View>
          </View>
        )}

        <Text style={styles.footer}>Este documento es una representación impresa de un CFDI.{'  '}•{'  '}Lugar de Expedición: {factura.emisor.cp}{'  '}•{'  '}{factura.emisor.regimenFiscal}</Text>
      </Page>
    </Document>
  );
};