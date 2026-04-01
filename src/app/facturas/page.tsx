'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, PlusCircle, Search, Eye, Download, Mail,
  Loader2, X, Ban, ArrowLeft, Stamp, Globe, Archive, CheckSquare, Copy, Check
} from 'lucide-react';
import Link from 'next/link';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Concepto = { descripcion: string; cantidad: number; importe: number; claveProdServ?: string; claveUnidad?: string; precioUnitario?: number; };
type Factura = {
  id: string; serie: string; folio: string; fecha: string; formaPago: string; metodoPago: string; moneda: string; subtotal: number; totalIVA: number; total: number; estado: string; uuid?: string; notas?: string; esGlobal?: boolean;
  client: { nombreRazonSocial: string; rfc: string; email?: string; cp?: string; regimenFiscal?: string; calle?: string; numExterior?: string; numInterior?: string; colonia?: string; municipio?: string; estado?: string; usoCfdiDefault?: string; };
  conceptos: Concepto[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ESTADO_BADGE: Record<string, string> = { BORRADOR: 'bg-amber-100 text-amber-700 border border-amber-200', TIMBRADO: 'bg-green-100 text-green-700 border border-green-200', CANCELADO: 'bg-red-100 text-red-600 border border-red-200', };
const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const fmtFecha = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const EMISOR = { nombre: 'OMAR ARTURO CORONA MONROY', rfc: 'COMO891216CM1', direccion: 'Francisco Clavijero 106 Int. 2, Centro', cp: '42000 HIDALGO', regimenFiscal: '626 - Régimen Simplificado de Confianza', };

// ─── Modal de Correo ──────────────────────────────────────────────────────────
function ModalCorreo({ factura, onClose, onEnviar, enviando, mensaje }: { factura: Factura; onClose: () => void; onEnviar: (correo: string) => void; enviando: boolean; mensaje: string; }) {
  const [correo, setCorreo] = useState(factura.client.email || '');
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Enviar por Correo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 space-y-1 border border-slate-100">
          <p><span className="font-bold">Documento:</span> {factura.serie}-{factura.folio}</p>
          <p><span className="font-bold">Cliente:</span> {factura.client.nombreRazonSocial}</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold uppercase text-slate-500">Correo destino</label>
          <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} className="w-full p-3 border-2 border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/10 text-base" placeholder="correo@ejemplo.com" />
        </div>
        {mensaje && <p className={`text-sm font-bold ${mensaje.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{mensaje}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-base font-bold">Cancelar</button>
          <button onClick={() => onEnviar(correo)} disabled={enviando || !correo} className="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-100">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  // ── ESTADOS PARA DESCARGA MASIVA ──
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [creandoZip, setCreandoZip] = useState(false);

  // ── ESTADOS PARA ACCIONES DE FILA ──
  const [expandida, setExpandida] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [timbrando, setTimbrando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [facturaCorreo, setFacturaCorreo] = useState<Factura | null>(null);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [msgCorreo, setMsgCorreo] = useState('');
  const [copiado, setCopiado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/facturas');
      const data = await res.json();
      setFacturas(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPaginaActual(1); setSeleccionadas([]); }, [q, filtroEstado]);

  const facturasFiltradas = facturas.filter(f => {
    const busqueda = q.toLowerCase();
    const coincideTexto = !q || f.client.nombreRazonSocial.toLowerCase().includes(busqueda) || f.client.rfc.toLowerCase().includes(busqueda) || f.serie.toLowerCase().includes(busqueda) || f.folio.toLowerCase().includes(busqueda);
    const coincideEstado = !filtroEstado || f.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  const totalPaginas = Math.ceil(facturasFiltradas.length / ITEMS_POR_PAGINA);
  const startIndex = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const facturasPaginadas = facturasFiltradas.slice(startIndex, startIndex + ITEMS_POR_PAGINA);
  const totalGeneral = facturasFiltradas.filter(f => f.estado !== 'CANCELADO').reduce((acc, f) => acc + Number(f.total), 0);

  // ── LÓGICA DE SELECCIÓN Y DESCARGA EN ZIP ──
  const toggleSeleccion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (seleccionadas.includes(id)) {
      setSeleccionadas(seleccionadas.filter(x => x !== id));
    } else {
      if (seleccionadas.length >= 10) { alert("Máximo 10 facturas a la vez para proteger el rendimiento de tu navegador."); return; }
      setSeleccionadas([...seleccionadas, id]);
    }
  };

  const handleDescargaMasiva = async () => {
    setCreandoZip(true);
    try {
      const zip = new JSZip();
      const folderPDFs = zip.folder("Facturas_PDF");

      const { pdf } = await import('@react-pdf/renderer');
      const { FacturaPDF } = await import('@/lib/pdf/FacturaPDF');
      const React = (await import('react')).default;

      for (const id of seleccionadas) {
        const f = facturas.find(x => x.id === id);
        if (!f) continue;
        const facturaData = { folio: f.folio, serie: f.serie, fecha: fmtFecha(f.fecha), estado: f.estado, uuid: f.uuid, emisor: EMISOR, receptor: { nombre: f.client.nombreRazonSocial, rfc: f.client.rfc, cp: f.client.cp, regimenFiscal: f.client.regimenFiscal }, conceptos: f.conceptos.map(c => ({ claveProdServ: c.claveProdServ, cantidad: c.cantidad, descripcion: c.descripcion, valorUnitario: c.precioUnitario, importe: c.importe })), subtotal: f.subtotal, iva: f.totalIVA, total: f.total, moneda: f.moneda, formaPago: f.formaPago, metodoPago: f.metodoPago };
        const blob = await pdf(React.createElement(FacturaPDF, { factura: facturaData as any, logoUrl: '/logo-tufisti.png' })).toBlob();
        folderPDFs?.file(`${f.serie}-${f.folio}_${f.client.rfc}.pdf`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const hoy = new Date();
      const fechaFormateada = `${hoy.getDate().toString().padStart(2, '0')}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getFullYear()}`;
      saveAs(zipBlob, `Lote_Facturas_${fechaFormateada}.zip`);

      setSeleccionadas([]);
    } catch (error) { alert("Error al generar el archivo ZIP."); } finally { setCreandoZip(false); }
  };

  // ── ACCIONES INDIVIDUALES (TIMBRAR, CANCELAR, DESCARGAR, CORREO) ──
  const handleDescargar = async (f: Factura, e: React.MouseEvent) => {
    e.stopPropagation(); setDescargando(f.id);
    try {
      const { pdf } = await import('@react-pdf/renderer'); const { FacturaPDF } = await import('@/lib/pdf/FacturaPDF'); const React = (await import('react')).default;
      const facturaData = { folio: f.folio, serie: f.serie, fecha: fmtFecha(f.fecha), estado: f.estado, uuid: f.uuid, emisor: EMISOR, receptor: { nombre: f.client.nombreRazonSocial, rfc: f.client.rfc, cp: f.client.cp, regimenFiscal: f.client.regimenFiscal }, conceptos: f.conceptos.map(c => ({ claveProdServ: c.claveProdServ, cantidad: c.cantidad, descripcion: c.descripcion, valorUnitario: c.precioUnitario, importe: c.importe })), subtotal: f.subtotal, iva: f.totalIVA, total: f.total, moneda: f.moneda, formaPago: f.formaPago, metodoPago: f.metodoPago };
      const blob = await pdf(React.createElement(FacturaPDF, { factura: facturaData as any, logoUrl: '/logo-tufisti.png' })).toBlob();
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Factura-${f.serie}${f.folio}.pdf`; a.click();
    } finally { setDescargando(null); }
  };

  const handleTimbrar = async (f: Factura, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Deseas timbrar el documento ${f.serie}-${f.folio} ante el SAT?`)) return;
    setTimbrando(f.id);
    try {
      const res = await fetch(`/api/facturas/${f.id}/timbrar`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) { alert('✅ Timbrado con éxito'); cargar(); } else alert(`❌ Error: ${data.error}`);
    } finally { setTimbrando(null); }
  };

  const handleCancelar = async (f: Factura, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Cancelar la factura ${f.serie}-${f.folio} en el SAT?\nEsta acción no se puede deshacer.`)) return;
    setCancelando(f.id);
    try {
      const res = await fetch(`/api/facturas/${f.id}/cancelar`, { method: 'PATCH' });
      if (res.ok) await cargar(); else { const err = await res.json(); alert(`❌ Error: ${err.error}`); }
    } finally { setCancelando(null); }
  };

  const handleEnviarCorreo = async (correo: string) => {
    if (!facturaCorreo) return;
    setEnviandoCorreo(true); setMsgCorreo('');
    try {
      const { pdf } = await import('@react-pdf/renderer'); const { FacturaPDF } = await import('@/lib/pdf/FacturaPDF'); const React = (await import('react')).default;
      const facturaData = { folio: facturaCorreo.folio, serie: facturaCorreo.serie, fecha: fmtFecha(facturaCorreo.fecha), estado: facturaCorreo.estado, uuid: facturaCorreo.uuid, emisor: EMISOR, receptor: { nombre: facturaCorreo.client.nombreRazonSocial, rfc: facturaCorreo.client.rfc, cp: facturaCorreo.client.cp, regimenFiscal: facturaCorreo.client.regimenFiscal }, conceptos: facturaCorreo.conceptos.map(c => ({ claveProdServ: c.claveProdServ, cantidad: c.cantidad, descripcion: c.descripcion, valorUnitario: c.precioUnitario, importe: c.importe })), subtotal: facturaCorreo.subtotal, iva: facturaCorreo.totalIVA, total: facturaCorreo.total, moneda: facturaCorreo.moneda, formaPago: facturaCorreo.formaPago, metodoPago: facturaCorreo.metodoPago };
      const blob = await pdf(React.createElement(FacturaPDF, { factura: facturaData as any, logoUrl: '/logo-tufisti.png' })).toBlob();
      const reader = new FileReader(); reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch(`/api/facturas/${facturaCorreo.id}/enviar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destinatario: correo, pdfBase64: base64 }) });
        const data = await res.json();
        setMsgCorreo(data.ok ? `✅ ${data.mensaje}` : `❌ ${data.error}`);
        if (data.ok) setTimeout(() => { setFacturaCorreo(null); setMsgCorreo(''); }, 2000);
        setEnviandoCorreo(false);
      };
    } catch (err) { setMsgCorreo('❌ Error al generar o enviar el PDF'); setEnviandoCorreo(false); }
  };

  const handleCopiar = (texto: string, id: string) => { navigator.clipboard.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(null), 2000); };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 relative">
      {facturaCorreo && <ModalCorreo factura={facturaCorreo} onClose={() => { setFacturaCorreo(null); setMsgCorreo(''); }} onEnviar={handleEnviarCorreo} enviando={enviandoCorreo} mensaje={msgCorreo} />}

      <div className="max-w-7xl mx-auto space-y-6 pb-24">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold transition-colors"><ArrowLeft className="w-5 h-5" /> Panel</Link>
            <FileText className="w-8 h-8 text-blue-600 ml-2" />
            <h1 className="text-3xl font-bold">Facturas</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/facturas/global" className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-bold text-base shadow-lg shadow-indigo-100"><Globe className="w-5 h-5" /> Factura Global</Link>
            <Link href="/facturas/nueva" className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold text-base shadow-lg shadow-blue-100"><PlusCircle className="w-5 h-5" /> Nueva Factura</Link>
          </div>
        </div>

        {/* KPIs y Buscador */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Encontradas', value: facturasFiltradas.length, color: 'text-slate-700' },
            { label: 'Timbradas', value: facturasFiltradas.filter(f => f.estado === 'TIMBRADO').length, color: 'text-green-600' },
            { label: 'Borradores', value: facturasFiltradas.filter(f => f.estado === 'BORRADOR').length, color: 'text-amber-600' },
            { label: 'Monto Total', value: fmt(totalGeneral), color: 'text-blue-700' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-500 mb-1">{k.label}</div><div className={`text-2xl font-bold ${k.color}`}>{k.value}</div></div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por cliente, RFC, serie o folio..." className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 text-base" />
          </div>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="p-3 border-2 border-slate-200 rounded-xl outline-none text-base bg-white">
            <option value="">Todos los estados</option><option value="BORRADOR">Borrador</option><option value="TIMBRADO">Timbrado</option><option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-base text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 w-12 text-center"><CheckSquare className="w-5 h-5 text-slate-400 mx-auto" /></th>
                  {['Folio', 'Fecha', 'Cliente / RFC', 'Total', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-6 py-4 text-sm font-bold uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                ) : facturasPaginadas.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-500">No se encontraron documentos</td></tr>
                ) : (
                  facturasPaginadas.map(f => (
                    <React.Fragment key={f.id}>
                      <tr className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${seleccionadas.includes(f.id) ? 'bg-blue-50' : ''}`} onClick={() => setExpandida(expandida === f.id ? null : f.id)}>
                        <td className="px-4 py-4 text-center" onClick={e => toggleSeleccion(f.id, e)}>
                          <div className={`w-5 h-5 border-2 rounded mx-auto flex items-center justify-center transition-colors ${seleccionadas.includes(f.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                            {seleccionadas.includes(f.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-blue-700">{f.serie}-{f.folio}</td>
                        <td className="px-6 py-4 text-slate-600">{fmtFecha(f.fecha)}</td>
                        <td className="px-6 py-4"><div className="font-bold text-slate-800">{f.client.nombreRazonSocial}</div><div className="text-sm font-mono text-slate-500 uppercase">{f.client.rfc}</div></td>
                        <td className="px-6 py-4 font-mono font-bold">{fmt(f.total)}</td>
                        <td className="px-6 py-4"><span className={`px-3 py-1 rounded-lg text-sm font-bold ${ESTADO_BADGE[f.estado]}`}>{f.estado}</span></td>

                        {/* ── BOTONES DE ACCIÓN RESTAURADOS ── */}
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button title="Ver detalle" onClick={() => setExpandida(expandida === f.id ? null : f.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-5 h-5" /></button>
                            <button title="Descargar PDF" onClick={(e) => handleDescargar(f, e)} disabled={descargando === f.id} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                              {descargando === f.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            </button>
                            <button title="Enviar por correo" onClick={() => { setFacturaCorreo(f); setMsgCorreo(''); }} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><Mail className="w-5 h-5" /></button>
                            {f.estado === 'BORRADOR' && (
                              <button title="Timbrar factura en el SAT" onClick={(e) => handleTimbrar(f, e)} disabled={timbrando === f.id} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                {timbrando === f.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stamp className="w-5 h-5" />}
                              </button>
                            )}
                            {f.estado !== 'CANCELADO' && (
                              <button title="Cancelar Factura" onClick={(e) => handleCancelar(f, e)} disabled={cancelando === f.id} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                {cancelando === f.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ban className="w-5 h-5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── FILA EXPANDIBLE DE DETALLES ── */}
                      {expandida === f.id && (
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={7} className="px-8 py-6">
                            <div className="space-y-4 max-w-4xl">
                              <div className="text-sm font-bold uppercase text-slate-500 mb-2">Desglose de Conceptos</div>
                              {f.conceptos.map((c, i) => (
                                <div key={i} className="flex justify-between text-base text-slate-700 bg-white rounded-xl px-5 py-3 border border-slate-200 shadow-sm">
                                  <span className="font-medium">{c.descripcion}</span>
                                  <span className="font-mono text-slate-500">x{Number(c.cantidad)}</span>
                                  <span className="font-mono font-bold text-slate-800">{fmt(Number(c.importe))}</span>
                                </div>
                              ))}
                              {f.uuid && (
                                <div className="text-sm font-mono text-green-700 mt-4 bg-green-50 p-3 rounded-xl border border-green-100 flex items-center justify-between">
                                  <span><span className="font-bold text-green-800">UUID (Folio Fiscal):</span> {f.uuid}</span>
                                  <button onClick={() => handleCopiar(f.uuid!, `uuid-${f.id}`)} className="p-1.5 hover:bg-green-200 rounded-md transition-colors">
                                    {copiado === `uuid-${f.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── PAGINACIÓN ── */}
          {totalPaginas > 1 && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between mt-auto">
              <span className="text-sm text-slate-500 font-medium">Página {paginaActual} de {totalPaginas} ({facturasFiltradas.length} resultados)</span>
              <div className="flex gap-2">
                <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50">Anterior</button>
                <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MENÚ FLOTANTE PARA DESCARGA MASIVA ── */}
      {seleccionadas.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 border border-slate-700">
          <div className="font-bold text-base">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-lg mr-3">{seleccionadas.length} / 10</span>
            Facturas seleccionadas
          </div>
          <button onClick={handleDescargaMasiva} disabled={creandoZip} className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
            {creandoZip ? <Loader2 className="w-5 h-5 animate-spin" /> : <Archive className="w-5 h-5" />}
            {creandoZip ? 'Comprimiendo ZIP...' : 'Descargar ZIP'}
          </button>
          <button onClick={() => setSeleccionadas([])} className="text-slate-400 hover:text-white p-2"><X className="w-5 h-5" /></button>
        </div>
      )}

    </div>
  );
}