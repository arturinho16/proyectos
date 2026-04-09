'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Archive, Download, Mail, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function ConsolidadoPage() {
    useInactivityTimeout(15);

    const [mes, setMes] = useState(new Date().getMonth());
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [correo, setCorreo] = useState('');

    const [procesando, setProcesando] = useState(false);
    const [progreso, setProgreso] = useState({ actual: 0, total: 0, etapa: '' });
    const [completado, setCompletado] = useState(false);

    // Reutilizamos el constructor de datos del PDF que tienes en facturas
    const buildFacturaData = async (f: any) => {
        // Función simplificada para extraer datos del XML necesario para el PDF
        const xml = f.xmlTimbrado || '';
        const getAttr = (name: string) => { const m = xml.match(new RegExp(`${name}=["']([^"']+)["']`, 'i')); return m ? m[1] : ''; };

        return {
            folio: f.folio, serie: f.serie, fecha: f.fecha, estado: f.estado, uuid: f.uuid || getAttr('UUID'),
            emisor: { nombre: 'OMAR ARTURO CORONA MONROY', rfc: 'COMO891216CM1', direccion: 'Francisco Clavijero 106 Int. 2, Centro', cp: '42000 HIDALGO', regimenFiscal: '626 - Régimen Simplificado de Confianza' },
            receptor: { nombre: f.client.nombreRazonSocial, rfc: f.client.rfc, cp: f.client.cp, usoCfdi: f.usoCFDI || f.client.usoCfdiDefault, regimenFiscal: f.client.regimenFiscal },
            conceptos: f.conceptos.map((c: any) => ({ descripcion: c.descripcion, cantidad: c.cantidad, valorUnitario: c.precioUnitario, importe: (c.cantidad * c.precioUnitario) })),
            subtotal: f.subtotal, iva: f.totalIVA, total: f.total, moneda: f.moneda, formaPago: f.formaPago, metodoPago: f.metodoPago,
            selloCfdi: getAttr('SelloCFD'), selloSat: getAttr('SelloSAT'), noCertificadoSat: getAttr('NoCertificadoSAT'), fechaTimbrado: getAttr('FechaTimbrado'), rfcPac: getAttr('RfcProvCertif'),
        };
    };
    const iniciarProceso = async (modo: 'descarga' | 'correo') => {
        if (modo === 'correo' && !correo) return alert('Ingresa un correo electrónico válido.');

        setProcesando(true);
        setCompletado(false);
        setProgreso({ actual: 0, total: 0, etapa: 'Calculando volumen...' });

        try {
            const resCount = await fetch(`/api/facturas/mensual?mes=${mes}&anio=${anio}&countOnly=true`);
            const { total } = await resCount.json();

            if (total === 0) {
                alert('No hay facturas timbradas en este mes.');
                setProcesando(false);
                return;
            }

            setProgreso({ actual: 0, total, etapa: 'Iniciando procesamiento...' });

            const mergedPdf = await PDFDocument.create();
            const zip = new JSZip();
            const folderXML = zip.folder(`XMLs_${MESES[mes]}_${anio}`);

            const { pdf } = await import('@react-pdf/renderer');
            const { FacturaPDF } = await import('@/lib/pdf/FacturaPDF');
            const React = (await import('react')).default;

            const BATCH_SIZE = 50;
            let procesadas = 0;

            for (let skip = 0; skip < total; skip += BATCH_SIZE) {
                setProgreso({ actual: procesadas, total, etapa: `Descargando lote ${skip} a ${skip + BATCH_SIZE}...` });

                const resBatch = await fetch(`/api/facturas/mensual?mes=${mes}&anio=${anio}&skip=${skip}&take=${BATCH_SIZE}`);
                const facturas = await resBatch.json();

                for (const f of facturas) {
                    setProgreso({ actual: procesadas, total, etapa: `Generando PDF y XML ${procesadas + 1} de ${total}...` });

                    if (f.xmlTimbrado) {
                        folderXML?.file(`${f.serie}-${f.folio}_${f.client.rfc}.xml`, f.xmlTimbrado);
                    }

                    const facturaData = await buildFacturaData(f);
                    const blob = await pdf(React.createElement(FacturaPDF, { factura: facturaData as any, logoUrl: '/logo-tufisti.png' })).toBlob();

                    const arrayBuffer = await blob.arrayBuffer();
                    const singlePdf = await PDFDocument.load(arrayBuffer);
                    const copiedPages = await mergedPdf.copyPages(singlePdf, singlePdf.getPageIndices());
                    copiedPages.forEach((page) => mergedPdf.addPage(page));

                    procesadas++;
                }
            }

            setProgreso({ actual: total, total, etapa: 'Empaquetando archivos finales...' });

            const mergedPdfBytes = await mergedPdf.save();
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            const fileNamePdf = `Consolidado_PDFs_${MESES[mes]}_${anio}.pdf`;
            const fileNameZip = `Consolidado_XMLs_${MESES[mes]}_${anio}.zip`;

            if (modo === 'descarga') {
                saveAs(new Blob([mergedPdfBytes], { type: 'application/pdf' }), fileNamePdf);
                saveAs(zipBlob, fileNameZip);
                setCompletado(true);
            } else {
                setProgreso({ actual: total, total, etapa: 'Enviando correo con adjuntos...' });

                // Convertir Uint8Array (PDF) a Base64
                let pdfBinary = '';
                const pdfBytes = new Uint8Array(mergedPdfBytes);
                for (let i = 0; i < pdfBytes.byteLength; i++) {
                    pdfBinary += String.fromCharCode(pdfBytes[i]);
                }
                const pdfBase64 = window.btoa(pdfBinary);

                // Convertir Blob (ZIP) a Base64
                const zipBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        resolve(result.split(',')[1]);
                    };
                    reader.readAsDataURL(zipBlob);
                });

                // Enviar a la nueva API
                const resCorreo = await fetch('/api/facturas/mensual/enviar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        destinatario: correo,
                        mesNombre: MESES[mes],
                        anio,
                        pdfBase64,
                        zipBase64
                    })
                });

                const dataCorreo = await resCorreo.json();

                if (dataCorreo.ok) {
                    setCompletado(true);
                } else {
                    alert(`❌ Error al enviar: ${dataCorreo.error}`);
                }
            }

        } catch (error) {
            console.error(error);
            alert('Ocurrió un error al procesar el consolidado. Intente de nuevo.');
        } finally {
            setProcesando(false);
        }
    };

    const porcentaje = progreso.total > 0 ? Math.round((progreso.actual / progreso.total) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* ENCABEZADO Y BOTÓN AL PANEL */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold transition-colors">
                            <ArrowLeft className="w-5 h-5" /> Panel
                        </Link>
                        <Archive className="w-8 h-8 text-blue-600 ml-2" />
                        <h1 className="text-3xl font-bold">Consolidado Mensual</h1>
                    </div>
                </div>

                {/* TARJETA DE CONFIGURACIÓN */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Cierre Mensual para Contabilidad</h2>
                        <p className="text-slate-500 text-sm">Descarga todas las facturas timbradas de un mes. El sistema generará 1 solo PDF continuo y un archivo .ZIP con todos los XML correspondientes.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Mes a procesar</label>
                            <select value={mes} onChange={e => setMes(Number(e.target.value))} disabled={procesando} className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white font-bold text-slate-700">
                                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Año</label>
                            <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} disabled={procesando} className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white font-bold text-slate-700" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Enviar copia al Contador (Opcional)</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                            <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} disabled={procesando} placeholder="correo@despacho.com" className="w-full pl-11 p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white" />
                        </div>
                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-1 font-medium"><AlertTriangle className="w-3 h-3" /> Nota: Correos muy pesados (+25MB) pueden ser rechazados por el servidor de destino.</p>
                    </div>

                    {/* BARRA DE PROGRESO */}
                    {procesando && (
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4">
                            <div className="flex justify-between text-sm font-bold text-blue-900">
                                <span>{progreso.etapa}</span>
                                <span>{porcentaje}% ({progreso.actual} / {progreso.total})</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                                <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${porcentaje}%` }}></div>
                            </div>
                        </div>
                    )}

                    {completado && (
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center gap-3 animate-in fade-in">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <span className="font-bold text-green-800">¡Proceso completado exitosamente! Archivos generados.</span>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                        <button onClick={() => iniciarProceso('descarga')} disabled={procesando} className="flex-1 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-base transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50">
                            {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            {procesando ? 'Procesando Documentos...' : 'Descarga Local (.PDF y .ZIP)'}
                        </button>
                        <button onClick={() => iniciarProceso('correo')} disabled={procesando || !correo} className="flex-1 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold text-base transition-all flex justify-center items-center gap-2 shadow-lg shadow-purple-200 disabled:opacity-50">
                            {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                            Enviar al Correo
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}