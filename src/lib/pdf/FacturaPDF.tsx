import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Image, Font
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { fontSize: 8, padding: 30, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  logo: { width: 80, height: 80, objectFit: 'contain' },
  emisorBox: { flex: 1, paddingLeft: 12 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#7c3aed', marginBottom: 2 },
  folio: { fontSize: 10, color: '#555' },
  bold: { fontFamily: 'Helvetica-Bold' },
  sectionTitle: {
    backgroundColor: '#7c3aed', color: 'white', padding: '4 8',
    fontFamily: 'Helvetica-Bold', fontSize: 9, marginTop: 8, marginBottom: 4
  },
  row: { flexDirection: 'row', marginBottom: 2 },
  label: { fontFamily: 'Helvetica-Bold', width: 120 },
  value: { flex: 1 },
  table: { marginTop: 6 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#7c3aed', color: 'white',
    padding: '4 6', fontFamily: 'Helvetica-Bold'
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', padding: '4 6' },
  tableRowAlt: { flexDirection: 'row', backgroundColor: '#f5f3ff', borderBottomWidth: 0.5, borderBottomColor: '#ddd', padding: '4 6' },
  col1: { width: '8%' },
  col2: { width: '8%' },
  col3: { width: '8%' },
  col4: { flex: 1 },
  col5: { width: '12%', textAlign: 'right' },
  col6: { width: '12%', textAlign: 'right' },
  totalsBox: { alignItems: 'flex-end', marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  totalLabel: { width: 120, textAlign: 'right', fontFamily: 'Helvetica-Bold', paddingRight: 8 },
  totalValue: { width: 80, textAlign: 'right' },
  totalFinal: {
    flexDirection: 'row', justifyContent: 'flex-end',
    backgroundColor: '#7c3aed', color: 'white', padding: '4 8', marginTop: 2
  },
  totalFinalLabel: { width: 120, textAlign: 'right', fontFamily: 'Helvetica-Bold', paddingRight: 8, color: 'white' },
  totalFinalValue: { width: 80, textAlign: 'right', color: 'white' },
  sellosBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 8 },
  sellosText: { fontSize: 5.5, color: '#666', marginBottom: 3, wordBreak: 'break-all' },
  footer: { marginTop: 8, fontSize: 6.5, color: '#888', textAlign: 'center' },
  watermark: {
    position: 'absolute', top: '40%', left: '15%',
    fontSize: 72, color: '#e5e7eb', opacity: 0.4,
    fontFamily: 'Helvetica-Bold', transform: 'rotate(-35deg)'
  },
  qrBox: { alignItems: 'center', marginTop: 8 },
  statusBadge: {
    fontSize: 7, padding: '2 6', borderRadius: 4,
    backgroundColor: '#fef3c7', color: '#92400e',
    alignSelf: 'flex-start', marginTop: 2
  },
  statusBadgeTimbrada: {
    fontSize: 7, padding: '2 6', borderRadius: 4,
    backgroundColor: '#d1fae5', color: '#065f46',
    alignSelf: 'flex-start', marginTop: 2
  },
});

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

interface FacturaPDFProps {
  factura: {
    folio: string;
    serie?: string;
    fecha: string;
    estado: string;
    uuid?: string;
    fechaTimbrado?: string;
    emisor: {
      nombre: string;
      rfc: string;
      direccion?: string;
      cp?: string;
      regimenFiscal?: string;
      telefono?: string;
    };
    receptor: {
      nombre: string;
      rfc: string;
      direccion?: string;
      cp?: string;
      usoCfdi?: string;
      regimenFiscal?: string;
    };
    conceptos: Array<{
      claveProdServ: string;
      cantidad: number;
      claveUnidad: string;
      descripcion: string;
      valorUnitario: number;
      importe: number;
    }>;
    subtotal: number;
    iva: number;
    total: number;
    moneda?: string;
    formaPago?: string;
    metodoPago?: string;
    exportacion?: string;
    totalLetra?: string;
    cadenaOriginal?: string;
    selloCfdi?: string;
    selloSat?: string;
    noCertificado?: string;
    noCertificadoSat?: string;
    rfcPac?: string;
  };
  logoUrl?: string;
}

export const FacturaPDF: React.FC<FacturaPDFProps> = ({ factura, logoUrl }) => {
  const esBorrador = factura.estado === 'BORRADOR';
  const serie = factura.serie ? `${factura.serie}` : '';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {esBorrador && <Text style={styles.watermark}>BORRADOR</Text>}

        {/* HEADER */}
        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.emisorBox}>
            <Text style={styles.title}>FACTURA</Text>
            <Text style={styles.folio}>FOLIO: {serie}{factura.folio}</Text>
            <Text style={{ marginTop: 4, ...styles.bold }}>{factura.emisor.nombre}</Text>
            <Text>{factura.emisor.rfc}</Text>
            {factura.emisor.direccion && <Text>{factura.emisor.direccion}</Text>}
            {factura.emisor.cp && <Text>CP: {factura.emisor.cp}</Text>}
            {factura.emisor.regimenFiscal && <Text>Régimen: {factura.emisor.regimenFiscal}</Text>}
            {factura.emisor.telefono && <Text>Tel: {factura.emisor.telefono}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={esBorrador ? styles.statusBadge : styles.statusBadgeTimbrada}>
              {factura.estado}
            </Text>
            <Text style={{ marginTop: 6, fontSize: 7 }}>Efecto: I - Ingreso</Text>
            {factura.exportacion && <Text style={{ fontSize: 7 }}>Exportación: {factura.exportacion}</Text>}
            {factura.uuid && (
              <Text style={{ fontSize: 6, marginTop: 4, color: '#555' }}>
                UUID: {factura.uuid}
              </Text>
            )}
          </View>
        </View>

        {/* RECEPTOR */}
        <Text style={styles.sectionTitle}>Receptor</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre:</Text>
          <Text style={styles.value}>{factura.receptor.nombre}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>RFC:</Text>
          <Text style={styles.value}>{factura.receptor.rfc}</Text>
        </View>
        {factura.receptor.direccion && (
          <View style={styles.row}>
            <Text style={styles.label}>Dirección:</Text>
            <Text style={styles.value}>{factura.receptor.direccion}</Text>
          </View>
        )}
        {factura.receptor.cp && (
          <View style={styles.row}>
            <Text style={styles.label}>Código Postal:</Text>
            <Text style={styles.value}>{factura.receptor.cp}</Text>
          </View>
        )}
        {factura.receptor.usoCfdi && (
          <View style={styles.row}>
            <Text style={styles.label}>Uso CFDI:</Text>
            <Text style={styles.value}>{factura.receptor.usoCfdi}</Text>
          </View>
        )}
        {factura.receptor.regimenFiscal && (
          <View style={styles.row}>
            <Text style={styles.label}>Régimen Fiscal:</Text>
            <Text style={styles.value}>{factura.receptor.regimenFiscal}</Text>
          </View>
        )}

        {/* DATOS CFDI */}
        <Text style={styles.sectionTitle}>Datos del Comprobante</Text>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ flex: 1 }}>
            <View style={styles.row}>
              <Text style={styles.label}>Fecha emisión:</Text>
              <Text style={styles.value}>{factura.fecha}</Text>
            </View>
            {factura.moneda && (
              <View style={styles.row}>
                <Text style={styles.label}>Moneda:</Text>
                <Text style={styles.value}>{factura.moneda}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            {factura.formaPago && (
              <View style={styles.row}>
                <Text style={styles.label}>Forma de Pago:</Text>
                <Text style={styles.value}>{factura.formaPago}</Text>
              </View>
            )}
            {factura.metodoPago && (
              <View style={styles.row}>
                <Text style={styles.label}>Método de Pago:</Text>
                <Text style={styles.value}>{factura.metodoPago}</Text>
              </View>
            )}
          </View>
        </View>

        {/* CONCEPTOS */}
        <Text style={styles.sectionTitle}>Conceptos</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Clave</Text>
            <Text style={styles.col2}>Cant.</Text>
            <Text style={styles.col3}>Unidad</Text>
            <Text style={styles.col4}>Descripción</Text>
            <Text style={styles.col5}>P. Unit.</Text>
            <Text style={styles.col6}>Importe</Text>
          </View>
          {factura.conceptos.map((c, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.col1}>{c.claveProdServ}</Text>
              <Text style={styles.col2}>{c.cantidad}</Text>
              <Text style={styles.col3}>{c.claveUnidad}</Text>
              <Text style={styles.col4}>{c.descripcion}</Text>
              <Text style={styles.col5}>{fmt(c.valorUnitario)}</Text>
              <Text style={styles.col6}>{fmt(c.importe)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALES */}
        <View style={styles.totalsBox}>
          {factura.totalLetra && (
            <Text style={{ fontSize: 7, color: '#555', marginBottom: 4, fontStyle: 'italic' }}>
              {factura.totalLetra}
            </Text>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{fmt(factura.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA 16%:</Text>
            <Text style={styles.totalValue}>{fmt(factura.iva)}</Text>
          </View>
          <View style={styles.totalFinal}>
            <Text style={styles.totalFinalLabel}>TOTAL:</Text>
            <Text style={styles.totalFinalValue}>{fmt(factura.total)}</Text>
          </View>
        </View>

        {/* SELLOS (solo si está timbrada) */}
        {!esBorrador && (
          <View style={styles.sellosBox}>
            <Text style={styles.sectionTitle}>Información de Timbrado</Text>
            {factura.fechaTimbrado && (
              <View style={styles.row}>
                <Text style={styles.label}>Fecha timbrado:</Text>
                <Text style={styles.value}>{factura.fechaTimbrado}</Text>
              </View>
            )}
            {factura.noCertificado && (
              <View style={styles.row}>
                <Text style={styles.label}>No. Certificado:</Text>
                <Text style={styles.value}>{factura.noCertificado}</Text>
              </View>
            )}
            {factura.noCertificadoSat && (
              <View style={styles.row}>
                <Text style={styles.label}>No. Cert. SAT:</Text>
                <Text style={styles.value}>{factura.noCertificadoSat}</Text>
              </View>
            )}
            {factura.rfcPac && (
              <View style={styles.row}>
                <Text style={styles.label}>RFC PAC:</Text>
                <Text style={styles.value}>{factura.rfcPac}</Text>
              </View>
            )}
            {factura.cadenaOriginal && (
              <>
                <Text style={{ ...styles.bold, fontSize: 7, marginTop: 4 }}>Cadena Original:</Text>
                <Text style={styles.sellosText}>{factura.cadenaOriginal}</Text>
              </>
            )}
            {factura.selloCfdi && (
              <>
                <Text style={{ ...styles.bold, fontSize: 7, marginTop: 4 }}>Sello Digital CFDI:</Text>
                <Text style={styles.sellosText}>{factura.selloCfdi}</Text>
              </>
            )}
            {factura.selloSat && (
              <>
                <Text style={{ ...styles.bold, fontSize: 7, marginTop: 4 }}>Sello Digital SAT:</Text>
                <Text style={styles.sellosText}>{factura.selloSat}</Text>
              </>
            )}
          </View>
        )}

        {/* FOOTER */}
        <Text style={styles.footer}>
          Este documento es una representación impresa de un CFDI. • Lugar de Expedición: {factura.emisor.cp} • {factura.emisor.regimenFiscal}
        </Text>
      </Page>
    </Document>
  );
};
