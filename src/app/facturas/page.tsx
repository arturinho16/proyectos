'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, PlusCircle, Search, Eye, Download, Mail,
  Loader2, X, Ban, ArrowLeft, Stamp, Copy, Check, Globe
} from 'lucide-react';
import Link from 'next/link';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Concepto = {
  descripcion: string;
  cantidad: number;
  importe: number;
  claveProdServ?: string;
  claveUnidad?: string;
  precioUnitario?: number;
};

type Factura = {
  id: string;
  serie: string;
  folio: string;
  fecha: string;
  formaPago: string;
  metodoPago: string;
  moneda: string;
  subtotal: number;
  totalIVA: number;
  total: number;
  estado: string;
  uuid?: string;
  notas?: string;
  esGlobal?: boolean;
  client: {
    nombreRazonSocial: string;
    rfc: string;
    email?: string;
    cp?: string;
    regimenFiscal?: string;
    calle?: string;
    numExterior?: string;
    numInterior?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    usoCfdiDefault?: string;
  };
  conceptos: Concepto[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: 'bg-amber-100 text-amber-700 border border-amber-200',
  TIMBRADO: 'bg-green-100 text-green-700 border border-green-200',
  CANCELADO: 'bg-red-100 text-red-600 border border-red-200',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtFecha = (d: string) =>
  new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const EMISOR = {
  nombre: 'OMAR ARTURO CORONA MONROY',
  rfc: 'COMO891216CM1',
  direccion: 'Francisco Clavijero 106 Int. 2, Centro',
  cp: '42000 HIDALGO',
  regimenFiscal: '626 - Régimen Simplificado de Confianza',
};

// ─── Modal de correo ──────────────────────────────────────────────────────────
function ModalCorreo({
  factura,
  onClose,
  onEnviar,
  enviando,
  mensaje,
}: {
  factura: Factura;
  onClose: () => void;
  onEnviar: (correo: string) => void;
  enviando: boolean;
  mensaje: string;
}) {
  const [correo, setCorreo] = useState(factura.client.email || '');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Enviar por Correo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-base text-slate-700 space-y-1 border border-slate-100">
          <p><span className="font-bold">Documento:</span> {factura.serie}-{factura.folio}</p>
          <p><span className="font-bold">Cliente:</span> {factura.client.nombreRazonSocial}</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold uppercase text-slate-500">Correo destino</label>
          <input
            type="email"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            className="w-full p-3 border-2 border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/10 text-base"
          />
        </div>
        {mensaje && (
          <p className={`text-base font-medium ${mensaje.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
            {mensaje}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-base font-bold">
            Cancelar
          </button>
          <button
            onClick={() => onEnviar(correo)}
            disabled={enviando || !correo}
            className="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  // Estados de UI
  const [expandida, setExpandida] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [facturaCorreo, setFacturaCorreo] = useState<Factura | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [msgCorreo, setMsgCorreo] = useState('');
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [timbrando, setTimbrando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/facturas');
      const data = await res.json();
      setFacturas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando facturas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPaginaActual(1); }, [q, filtroEstado]);

  // ── Filtrado Local (Búsqueda Universal) ──
  const facturasFiltradas = facturas.filter(f => {
    const busqueda = q.toLowerCase();
    const coincideTexto = !q ||
      f.client.nombreRazonSocial.toLowerCase().includes(busqueda) ||
      f.client.rfc.toLowerCase().includes(busqueda) ||
      f.serie.toLowerCase().includes(busqueda) ||
      f.folio.toLowerCase().includes(busqueda);

    const coincideEstado = !filtroEstado || f.estado === filtroEstado;

    return coincideTexto && coincideEstado;
  });

  const totalPaginas = Math.ceil(facturasFiltradas.length / ITEMS_POR_PAGINA);
  const startIndex = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const facturasPaginadas = facturasFiltradas.slice(startIndex, startIndex + ITEMS_POR_PAGINA);

  const totalGeneral = facturasFiltradas
    .filter(f => f.estado !== 'CANCELADO')
    .reduce((acc, f) => acc + Number(f.total), 0);

  // ── Acciones (Timbrar, Cancelar, Descargar) ──
  const handleDescargar = async (f: Factura, e: React.MouseEvent) => {
    e.stopPropagation();
    setDescargando(f.id);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { FacturaPDF } = await import('@/lib/pdf/FacturaPDF');
      const React = (await import('react')).default;

      const facturaData = {
        folio: f.folio, serie: f.serie, fecha: fmtFecha(f.fecha), estado: f.estado, uuid: f.uuid, emisor: EMISOR,
        receptor: { nombre: f.client.nombreRazonSocial, rfc: f.client.rfc, cp: f.client.cp, regimenFiscal: f.client.regimenFiscal },
        conceptos: f.conceptos.map(c => ({ claveProdServ: c.claveProdServ, cantidad: c.cantidad, descripcion: c.descripcion, valorUnitario: c.precioUnitario, importe: c.importe })),
        subtotal: f.subtotal, iva: f.totalIVA, total: f.total, moneda: f.moneda, formaPago: f.formaPago, metodoPago: f.metodoPago
      };

      const blob = await pdf(React.createElement(FacturaPDF, { factura: facturaData as any, logoUrl: '/logo-tufisti.png' })).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Factura-${f.serie}${f.folio}.pdf`; a.click();
    } finally { setDescargando(null); }
  };

  const handleTimbrar = async (f: Factura, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Deseas timbrar este documento ante el SAT?')) return;
    setTimbrando(f.id);
    try {
      const res = await fetch(`/api/facturas/${f.id}/timbrar`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) { alert('✅ Timbrado con éxito'); cargar(); } else alert(`❌ Error: ${data.error}`);
    } finally { setTimbrando(null); }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      {facturaCorreo && (
        <ModalCorreo factura={facturaCorreo} onClose={() => setFacturaCorreo(null)} onEnviar={() => { }} enviando={enviando} mensaje={msgCorreo} />
      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header con Acceso PRO a Factura Global */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold transition-colors">
              <ArrowLeft className="w-5 h-5" /> Panel
            </Link>
            <FileText className="w-8 h-8 text-blue-600 ml-2" />
            <h1 className="text-3xl font-bold">Facturas</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/facturas/global"
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-bold text-base shadow-lg shadow-indigo-100"
            >
              <Globe className="w-5 h-5" /> Factura Global
            </Link>
            <Link
              href="/facturas/nueva"
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold text-base shadow-lg shadow-blue-100"
            >
              <PlusCircle className="w-5 h-5" /> Nueva Factura
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Encontradas', value: facturasFiltradas.length, color: 'text-slate-700' },
            { label: 'Timbradas', value: facturasFiltradas.filter(f => f.estado === 'TIMBRADO').length, color: 'text-green-600' },
            { label: 'Borradores', value: facturasFiltradas.filter(f => f.estado === 'BORRADOR').length, color: 'text-amber-600' },
            { label: 'Monto Total', value: fmt(totalGeneral), color: 'text-blue-700' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-500 mb-1">{k.label}</div>
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Buscador Universal */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por cliente, RFC, serie o folio..."
              className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 text-base"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="p-3 border-2 border-slate-200 rounded-xl outline-none text-base bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="TIMBRADO">Timbrado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        {/* Tabla con Paginación */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-base text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Folio', 'Fecha', 'Cliente / RFC', 'Total', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-6 py-4 text-sm font-bold uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                ) : facturasPaginadas.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">No se encontraron documentos</td></tr>
                ) : (
                  facturasPaginadas.map(f => (
                    <React.Fragment key={f.id}>
                      <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setExpandida(expandida === f.id ? null : f.id)}>
                        <td className="px-6 py-4 font-mono font-bold text-blue-700">{f.serie}-{f.folio}</td>
                        <td className="px-6 py-4 text-slate-600">{fmtFecha(f.fecha)}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{f.client.nombreRazonSocial}</div>
                          <div className="text-sm font-mono text-slate-500 uppercase">{f.client.rfc}</div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold">{fmt(f.total)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-lg text-sm font-bold ${ESTADO_BADGE[f.estado]}`}>
                            {f.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setExpandida(expandida === f.id ? null : f.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-5 h-5" /></button>
                            <button onClick={(e) => handleDescargar(f, e)} disabled={descargando === f.id} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                              {descargando === f.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            </button>
                            {f.estado === 'BORRADOR' && (
                              <button onClick={(e) => handleTimbrar(f, e)} disabled={timbrando === f.id} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                {timbrando === f.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stamp className="w-5 h-5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Barra de Paginación */}
          {totalPaginas > 1 && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between mt-auto">
              <span className="text-sm text-slate-500 font-medium">
                Página {paginaActual} de {totalPaginas} ({facturasFiltradas.length} resultados)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}