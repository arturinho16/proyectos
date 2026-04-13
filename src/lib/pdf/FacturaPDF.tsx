import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const fmt = (n: number | string) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(toNumber(n));

const styles = StyleSheet.create({
  page: { fontSize: 10, padding: 36, fontFamily: 'Helvetica', color: '#1a1a1a', backgroundColor: '#ffffff' },
  watermark: { position: 'absolute', top: '38%', left: '10%', fontSize: 80, color: '#e5e7eb', opacity: 0.5, fontFamily: 'Helvetica-Bold', transform: 'rotate(-35deg)' },
  headerRow: { flexDirection: 'row', marginBottom: 14, gap: 12, alignItems: 'stretch' },
  logoBox: { width: 90, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 88, height: 88, objectFit: 'contain' },
  emisorBox: { flex: 1.05, paddingLeft: 8, justifyContent: 'center' },
  receptorBox: { flex: 0.95, paddingLeft: 14, marginLeft: 4, borderLeftWidth: 1, borderLeftColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  facturaLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#dc2626', letterSpacing: 1, marginBottom: 4 },
  folioLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#dc2626', letterSpacing: 1, marginBottom: 4, textAlign: 'right' },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', marginBottom: 3, textTransform: 'uppercase' },
  receptorSectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', textAlign: 'center' },
  bold: { fontFamily: 'Helvetica-Bold' },
  lineText: { marginBottom: 2, fontSize: 8 },
  receptorName: { marginBottom: 2, fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  receptorLineText: { marginBottom: 2, fontSize: 8, textAlign: 'center' },
  receptorInfoLine: { marginBottom: 2, fontSize: 8, textAlign: 'center', lineHeight: 1.25 },
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
  cProd: { width: '10%' },
  cCant: { width: '8%' },
  cUnidad: { width: '12%', paddingRight: 4 },
  cDesc: { flex: 1, paddingRight: 4 },
  cPrecio: { width: '12%', textAlign: 'right' },
  cImporte: { width: '12%', textAlign: 'right' },
  conceptoSub: { fontSize: 6.5, color: '#6b7280', marginTop: 2 },
  conceptoSubBold: { fontSize: 6.5, color: '#374151', fontFamily: 'Helvetica-Bold' },
  totalesBox: { width: 200 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  totalLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151' },
  totalValue: { fontSize: 8, color: '#374151', textAlign: 'right' },
  totalFinalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, marginTop: 2 },
  totalFinalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  totalFinalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  letraRow: { flexDirection: 'row', marginTop: 6, alignItems: 'center' },
  letraLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', width: 90 },
  letraValue: { fontSize: 7, flex: 1, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  monedaRow: { flexDirection: 'row', marginTop: 4 },
  monedaLabel: { fontSize: 7, color: '#6b7280', width: 90 },
  monedaValue: { fontSize: 7, color: '#6b7280' },
  sellosContainer: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: '#1a1a1a', paddingTop: 8 },
  qrBox: { width: 90, alignItems: 'center', justifyContent: 'flex-start' },
  qrImage: { width: 85, height: 85 },
  sellosInfoBox: { flex: 1, paddingLeft: 10 },
  sellosTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 2 },
  sellosText: { fontSize: 5.5, color: '#4b5563', marginBottom: 6, lineHeight: 1.3 },
  footer: { marginTop: 10, fontSize: 7.5, color: '#9ca3af', textAlign: 'center', borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 6 },
});

interface Concepto {
  claveProdServ: string;
  cantidad: number;
  claveUnidad: string;
  unidad?: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  objetoImpuesto?: string;
  ivaTasa?: number | string;
  iepsImporte?: number;
  noIdentificacion?: string;
}

interface FacturaPDFProps {
  factura: {
    folio: string;
    serie?: string;
    fecha: string;
    estado: string;
    uuid?: string;
    qrCodeUrl?: string;
    cadenaOriginal?: string;
    selloCfdi?: string;
    selloSat?: string;
    noCertificado?: string;
    noCertificadoSat?: string;
    fechaTimbrado?: string;
    rfcPac?: string;
    emisor: { nombre: string; rfc: string; direccion?: string; cp?: string; regimenFiscal?: string; telefono?: string; };
    receptor: { nombre: string; rfc: string; direccion?: string; cp?: string; usoCfdi?: string; regimenFiscal?: string; };
    conceptos: Concepto[];
    subtotal: number;
    iva: number;
    total: number;
    moneda?: string;
    formaPago?: string;
    metodoPago?: string;
    exportacion?: string;
    totalLetra?: string;
    tipoComprobante?: string;
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
          <View style={styles.logoBox}>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          </View>

          <View style={styles.emisorBox}>
            <Text style={styles.sectionLabel}>Emisor:</Text>
            <Text style={[styles.bold, styles.lineText]}>{factura.emisor.nombre}</Text>
            <Text style={styles.lineText}>{factura.emisor.rfc}</Text>
            {factura.emisor.direccion && <Text style={styles.lineText}>{factura.emisor.direccion}</Text>}
            {factura.emisor.cp && <Text style={styles.lineText}>Lugar de Expedición: {factura.emisor.cp}</Text>}
            {factura.emisor.regimenFiscal && <Text style={styles.lineText}>Régimen Fiscal: {factura.emisor.regimenFiscal}</Text>}
            {factura.emisor.telefono && <Text style={styles.lineText}>Tel: {factura.emisor.telefono}</Text>}

            {/* Aquí aplicamos el cambio de Tipo de Comprobante Dinámico */}
            {factura.tipoComprobante && (
              <Text style={styles.lineText}>Efecto del comprobante: {factura.tipoComprobante}</Text>
            )}
          </View>

          <View style={styles.receptorBox}>
            <Text style={styles.receptorSectionLabel}>Receptor:</Text>
            <Text style={styles.receptorName}>{factura.receptor.nombre}</Text>
            <Text style={styles.receptorLineText}>{factura.receptor.rfc}</Text>
            {factura.receptor.direccion && <Text style={styles.receptorLineText}>{factura.receptor.direccion}</Text>}
            {factura.receptor.cp && <Text style={styles.receptorInfoLine}><Text style={styles.bold}>Código postal: </Text>{factura.receptor.cp}</Text>}
            {factura.receptor.usoCfdi && <Text style={styles.receptorInfoLine}><Text style={styles.bold}>Uso del CFDI: </Text>{factura.receptor.usoCfdi}</Text>}
            {factura.receptor.regimenFiscal && <Text style={styles.receptorInfoLine}><Text style={styles.bold}>Régimen Fiscal: </Text>{factura.receptor.regimenFiscal}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {(factura.uuid || factura.fecha || factura.noCertificado) && (
          <View style={styles.cfdiRow}>
            {factura.uuid && (
              <View style={styles.cfdiCell}><Text style={styles.cfdiLabel}>Folio Fiscal:</Text><Text style={styles.cfdiValue}>{factura.uuid}</Text></View>
            )}
            <View style={styles.cfdiCell}><Text style={styles.cfdiLabel}>Fecha / Hora de Emisión:</Text><Text style={styles.cfdiValue}>{factura.fecha}</Text></View>
            {factura.noCertificado && (
              <View style={styles.cfdiCell}><Text style={styles.cfdiLabel}>No. de Certificado Digital:</Text><Text style={styles.cfdiValue}>{factura.noCertificado}</Text></View>
            )}
          </View>
        )}

        <View style={styles.exportRow}>
          <Text style={styles.exportLabel}>Exportación:</Text>
          <Text style={styles.exportValue}>{factura.exportacion ?? '01 - No aplica'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.tableHeader} fixed>
          <Text style={styles.cProd}>Producto</Text>
          <Text style={styles.cCant}>Cantidad</Text>
          <Text style={styles.cUnidad}>Unidad</Text>
          <Text style={styles.cDesc}>Concepto(s)</Text>
          <Text style={styles.cPrecio}>Precio U</Text>
          <Text style={styles.cImporte}>Importe</Text>
        </View>

        {factura.conceptos.map((c, i) => {
          const tasaIva = toNumber(c.ivaTasa, 0.16);
          const importeConcepto = toNumber(c.importe);
          const valorUnitario = toNumber(c.valorUnitario);
          const ivaImporte = c.objetoImpuesto !== '01' ? importeConcepto * tasaIva : 0;
          const objetoLabel = c.objetoImpuesto === '01' ? '01 - Sin objeto de impuesto' : '02 - Con objeto de impuesto';

          return (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cProd}>{c.claveProdServ}</Text>
              <Text style={styles.cCant}>{toNumber(c.cantidad)}</Text>
              <View style={styles.cUnidad}><Text>{c.claveUnidad}</Text>{c.unidad && <Text style={styles.conceptoSub}>{c.unidad}</Text>}</View>
              <View style={styles.cDesc}>
                <Text>{c.descripcion}</Text>
                <Text style={styles.conceptoSub}>{objetoLabel}</Text>
                {c.noIdentificacion && (
                  <View style={{ flexDirection: 'row' }}><Text style={styles.conceptoSubBold}>No Identificación: </Text><Text style={styles.conceptoSub}>{c.noIdentificacion}</Text></View>
                )}
                {c.objetoImpuesto !== '01' && (
                  <View><Text style={styles.conceptoSubBold}>Traslados:</Text><Text style={styles.conceptoSub}>IVA: 002, Base: {fmt(importeConcepto)}, Tasa: {tasaIva.toFixed(6)}, Importe: {fmt(ivaImporte)}</Text></View>
                )}
              </View>
              <Text style={styles.cPrecio}>{fmt(valorUnitario)}</Text>
              <Text style={styles.cImporte}>{fmt(importeConcepto)}</Text>
            </View>
          );
        })}

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <View style={styles.monedaRow}><Text style={styles.monedaLabel}>Moneda:</Text><Text style={styles.monedaValue}>{factura.moneda ?? 'MXN - Peso Mexicano'}</Text></View>
            {factura.totalLetra && (
              <View style={styles.letraRow}><Text style={styles.letraLabel}>Monto con letra:</Text><Text style={styles.letraValue}>{factura.totalLetra}</Text></View>
            )}
            {factura.formaPago && (
              <View style={styles.monedaRow}><Text style={styles.monedaLabel}>Forma de Pago:</Text><Text style={styles.monedaValue}>{factura.formaPago}</Text></View>
            )}
            {factura.metodoPago && (
              <View style={styles.monedaRow}><Text style={styles.monedaLabel}>Método de Pago:</Text><Text style={styles.monedaValue}>{factura.metodoPago}</Text></View>
            )}
          </View>

          <View style={styles.totalesBox}>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal:</Text><Text style={styles.totalValue}>{fmt(factura.subtotal)}</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>IVA (16%):</Text><Text style={styles.totalValue}>{fmt(factura.iva)}</Text></View>
            <View style={styles.totalFinalRow}><Text style={styles.totalFinalLabel}>TOTAL:</Text><Text style={styles.totalFinalValue}>{fmt(factura.total)}</Text></View>
          </View>
        </View>

        <View style={styles.divider} />

        {(factura.selloCfdi || factura.selloSat || factura.qrCodeUrl) && (
          <View style={styles.sellosContainer}>
            {factura.qrCodeUrl && (
              <View style={styles.qrBox}><Image src={factura.qrCodeUrl} style={styles.qrImage} /></View>
            )}
            <View style={styles.sellosInfoBox}>
              {factura.cadenaOriginal && (
                <View style={{ marginBottom: 6 }}><Text style={styles.sellosTitle}>Cadena Original del complemento de Certificación Digital del SAT:</Text><Text style={styles.sellosText}>{factura.cadenaOriginal}</Text></View>
              )}
              {factura.selloCfdi && (
                <View style={{ marginBottom: 6 }}><Text style={styles.sellosTitle}>Sello Digital del CFDI:</Text><Text style={styles.sellosText}>{factura.selloCfdi}</Text></View>
              )}
              {factura.selloSat && (
                <View style={{ marginBottom: 6 }}><Text style={styles.sellosTitle}>Sello Digital del SAT:</Text><Text style={styles.sellosText}>{factura.selloSat}</Text></View>
              )}
              {factura.noCertificadoSat && (
                <View style={{ marginBottom: 2 }}><Text style={styles.sellosTitle}>Número de Serie Certificado del SAT:</Text><Text style={styles.sellosText}>{factura.noCertificadoSat}</Text></View>
              )}
              {factura.rfcPac && (
                <View style={{ marginBottom: 2 }}><Text style={styles.sellosTitle}>RFC del PAC:</Text><Text style={styles.sellosText}>{factura.rfcPac}</Text></View>
              )}
              {factura.fechaTimbrado && (
                <View><Text style={styles.sellosTitle}>Fecha / Hora de Certificación:</Text><Text style={styles.sellosText}>{factura.fechaTimbrado}</Text></View>
              )}
            </View>
          </View>
        )}
        <Text style={styles.footer}>Este documento es una representación impresa de un CFDI — Versión 4.0</Text>
      </Page>
    </Document>
  );
};