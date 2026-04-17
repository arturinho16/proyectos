import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

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
    page: { fontSize: 8, padding: 30, fontFamily: 'Helvetica', color: '#1a1a1a', backgroundColor: '#ffffff' },
    headerRow: { flexDirection: 'row', marginBottom: 12, justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 10 },
    logoBox: { width: 110 },
    logo: { width: 100, height: 100, objectFit: 'contain' },
    emisorBox: { flex: 1, paddingLeft: 10, justifyContent: 'center' },
    emisorName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 2 },
    emisorText: { fontSize: 7, color: '#475569', marginBottom: 1 },

    titleBox: { alignItems: 'flex-end', justifyContent: 'center', width: 160 },
    title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0f172a', letterSpacing: 1 },
    subtitle: { fontSize: 8, color: '#64748b', marginTop: 3 },

    gridContainer: { flexDirection: 'row', gap: 10, marginBottom: 10, marginTop: 5 },
    colReceptor: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 6 },
    colLaboral: { flex: 0.8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 6 },

    infoRow: { flexDirection: 'row', marginBottom: 3 },
    infoLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#475569', width: '40%' },
    infoValue: { fontSize: 7, color: '#0f172a', width: '60%' },

    tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingVertical: 4, paddingHorizontal: 4, fontFamily: 'Helvetica-Bold', fontSize: 7, marginTop: 8 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 4, paddingHorizontal: 4 },

    colConcepto: { flex: 1 },
    colImporte: { width: '30%', textAlign: 'right' },

    splitTables: { flexDirection: 'row', gap: 15, marginTop: 5 },
    halfTable: { width: '50%' },

    totalesBox: { alignSelf: 'flex-end', width: 220, marginTop: 12 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
    totalLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569' },
    totalValue: { fontSize: 8, color: '#0f172a', textAlign: 'right' },
    netoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, marginTop: 2, backgroundColor: '#f1f5f9', paddingHorizontal: 4, borderRadius: 2 },
    netoLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
    netoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#166534', textAlign: 'right' },

    sellosContainer: { flexDirection: 'row', marginTop: 20, borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 10 },
    qrBox: { width: 90, alignItems: 'center', justifyContent: 'flex-start' },
    qrImage: { width: 85, height: 85 },
    sellosInfoBox: { flex: 1, paddingLeft: 10 },
    sellosTitle: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#475569', marginBottom: 1 },
    sellosText: { fontSize: 5, color: '#64748b', marginBottom: 4, lineHeight: 1.2 },
    footer: { marginTop: 10, fontSize: 6.5, color: '#94a3b8', textAlign: 'center' },
});

export interface NominaPDFProps {
    nomina: any; // Aquí pasaremos todo el objeto formateado
    logoUrl?: string;
}

export const NominaPDF: React.FC<NominaPDFProps> = ({ nomina, logoUrl }) => {
    return (
        <Document>
            <Page size="LETTER" style={styles.page}>

                {/* ENCABEZADO Y EMISOR */}
                <View style={styles.headerRow}>
                    <View style={styles.logoBox}>
                        {logoUrl && <Image src={logoUrl} style={styles.logo} />}
                    </View>
                    <View style={styles.emisorBox}>
                        <Text style={styles.emisorName}>{nomina.emisor.nombre}</Text>
                        {nomina.emisor.direccion && <Text style={styles.emisorText}>{nomina.emisor.direccion}</Text>}
                        <Text style={styles.emisorText}>RFC: {nomina.emisor.rfc}</Text>
                        <Text style={styles.emisorText}>{nomina.emisor.regimenFiscalDesc}</Text>
                        <Text style={styles.emisorText}>Registro Patronal IMSS: {nomina.emisor.registroPatronal}</Text>
                    </View>
                    <View style={styles.titleBox}>
                        <Text style={styles.title}>RECIBO DE NÓMINA</Text>
                        <Text style={styles.subtitle}>Folio: {nomina.folio}</Text>
                        {nomina.uuid && <Text style={styles.subtitle}>UUID: {nomina.uuid}</Text>}
                    </View>
                </View>

                {/* DATOS DEL TRABAJADOR Y LABORALES */}
                <View style={styles.gridContainer}>
                    <View style={styles.colReceptor}>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>No. Trab:</Text><Text style={styles.infoValue}>{nomina.empleado.numEmpleado}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>Nombre:</Text><Text style={styles.infoValue}>{nomina.empleado.nombre}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>CURP:</Text><Text style={styles.infoValue}>{nomina.empleado.curp}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>RFC:</Text><Text style={styles.infoValue}>{nomina.empleado.rfc}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>R. IMSS:</Text><Text style={styles.infoValue}>{nomina.empleado.nss}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>Régimen Trabajador:</Text><Text style={styles.infoValue}>{nomina.empleado.regimenContratacion}</Text></View>
                    </View>

                    <View style={styles.colLaboral}>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>Puesto:</Text><Text style={styles.infoValue}>{nomina.empleado.puesto}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>Depto:</Text><Text style={styles.infoValue}>{nomina.empleado.departamento}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>No. Nomina:</Text><Text style={styles.infoValue}>{nomina.noNomina || nomina.folio}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>Periodo del:</Text><Text style={styles.infoValue}>{nomina.fechaInicialPago} AL {nomina.fechaFinalPago}</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>Días Pagados:</Text><Text style={styles.infoValue}>{nomina.diasPagados}</Text></View>
                    </View>
                </View>

                {/* PERCEPCIONES Y DEDUCCIONES */}
                <View style={styles.splitTables}>
                    <View style={styles.halfTable}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.colConcepto}>Percepciones</Text>
                            <Text style={styles.colImporte}>Importe</Text>
                        </View>
                        {nomina.percepciones.map((p: any, i: number) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colConcepto}>{p.concepto}</Text>
                                <Text style={styles.colImporte}>{fmt(toNumber(p.importeGravado) + toNumber(p.importeExento))}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.halfTable}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.colConcepto}>Deducciones</Text>
                            <Text style={styles.colImporte}>Importe</Text>
                        </View>
                        {nomina.deducciones.map((d: any, i: number) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colConcepto}>{d.concepto}</Text>
                                <Text style={styles.colImporte}>{fmt(d.importe)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* TOTALES */}
                <View style={styles.totalesBox}>
                    <View style={styles.totalRow}><Text style={styles.totalLabel}>Total de Percepciones:</Text><Text style={styles.totalValue}>{fmt(nomina.totales.totalPercepciones)}</Text></View>
                    <View style={styles.totalRow}><Text style={styles.totalLabel}>Total de Deducciones:</Text><Text style={styles.totalValue}>{fmt(nomina.totales.totalDeducciones)}</Text></View>
                    <View style={styles.netoRow}><Text style={styles.netoLabel}>Neto pagado:</Text><Text style={styles.netoValue}>{fmt(nomina.totales.totalNeto)}</Text></View>
                </View>

                {/* TIMBRE FISCAL */}
                {(nomina.cfdi.selloCfdi || nomina.cfdi.qrCodeUrl) && (
                    <View style={styles.sellosContainer}>
                        {nomina.cfdi.qrCodeUrl && <View style={styles.qrBox}><Image src={nomina.cfdi.qrCodeUrl} style={styles.qrImage} /></View>}
                        <View style={styles.sellosInfoBox}>
                            {nomina.cfdi.cadenaOriginal && <View><Text style={styles.sellosTitle}>Cadena Original:</Text><Text style={styles.sellosText}>{nomina.cfdi.cadenaOriginal}</Text></View>}
                            {nomina.cfdi.selloSat && <View><Text style={styles.sellosTitle}>Sello Digital del SAT:</Text><Text style={styles.sellosText}>{nomina.cfdi.selloSat}</Text></View>}
                            {nomina.cfdi.selloCfdi && <View><Text style={styles.sellosTitle}>Sello Digital del CFDI:</Text><Text style={styles.sellosText}>{nomina.cfdi.selloCfdi}</Text></View>}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View><Text style={styles.sellosTitle}>Certificado SAT:</Text><Text style={styles.sellosText}>{nomina.cfdi.noCertificadoSat}</Text></View>
                                <View><Text style={styles.sellosTitle}>Fecha Timbrado:</Text><Text style={styles.sellosText}>{nomina.cfdi.fechaTimbrado}</Text></View>
                            </View>
                        </View>
                    </View>
                )}
                <Text style={styles.footer}>Este documento es una representación impresa de un CFDI de Nómina Versión 4.0</Text>
            </Page>
        </Document>
    );
};