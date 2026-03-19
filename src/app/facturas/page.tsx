'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, PlusCircle, Search, Eye, Download, Mail, Loader2, X, Ban } from 'lucide-react';
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
  BORRADOR: 'bg-amber-100 text-amber-700',
  TIMBRADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-600',
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Enviar Factura por Correo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 space-y-1">
          <p><span className="font-bold">Factura:</span> {factura.serie}-{factura.folio}</p>
          <p><span className="font-bold">Cliente:</span> {factura.client.nombreRazonSocial}</p>
          <p><span className="font-bold">Total:</span> {fmt(Number(factura.total))}</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-400">Correo destino</label>
          <input
            type="email"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
        {mensaje && (
          <p className={`text-sm font-medium ${mensaje.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
            {mensaje}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => onEnviar(correo)}
            disabled={enviando || !correo}
            className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-bold flex items-center justify-center gap-2"
          >
            {enviando ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Mail className="w-4 h-4" /> Enviar</>}
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
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [expandida, setExpandida] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [facturaCorreo, setFacturaCorreo] = useState<Factura | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [msgCorreo, setMsgCorreo] = useState('');
  const [cancelando, setCancelando] = useState<string | null>(null); // ← nuevo

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (filtroEstado) params.set('estado', filtroEstado);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const res = await fetch(`/api/facturas?${params}`);
    const data = await res.json();
    setFacturas(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [q, filtroEstado, desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleDescargar = async (f: Factura, e: React.MouseEvent) => {
    e.stopPropagation();
    setDescargando(f.id);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { FacturaPDF } = await import('@/lib/pdf/FacturaPDF');
      const React = (await import('react')).default;

      const direccionReceptor = [
        f.client.calle,
        f.client.numExterior ? `#${f.client.numExterior}` : '',
        f.client.numInterior ? `Int. ${f.client.numInterior}` : '',
        f.client.colonia,
        f.client.municipio,
        f.client.estado,
      ].filter(Boolean).join(', ');

      const facturaData = {
        folio: f.folio,
        serie: f.serie,
        fecha: fmtFecha(f.fecha),
        estado: f.estado,
        uuid: f.uuid,
        emisor: EMISOR,
        receptor: {
          nombre: f.client.nombreRazonSocial,
          rfc: f.client.rfc,
          direccion: direccionReceptor || undefined,
          cp: f.client.cp,
          usoCfdi: f.client.usoCfdiDefault,
          regimenFiscal: f.client.regimenFiscal,
        },
        conceptos: f.conceptos.map(c => ({
          claveProdServ: c.claveProdServ || '01010101',
          cantidad: Number(c.cantidad),
          claveUnidad: c.claveUnidad || 'H87',
          descripcion: c.descripcion,
          valorUnitario: Number(c.precioUnitario ?? (Number(c.importe) / Number(c.cantidad))),
          importe: Number(c.importe),
        })),
        subtotal: Number(f.subtotal),
        iva: Number(f.totalIVA),
        total: Number(f.total),
        moneda: f.moneda || 'MXN - Peso Mexicano',
        formaPago: f.formaPago,
        metodoPago: f.metodoPago,
      };

      const blob = await pdf(
        React.createElement(FacturaPDF, { factura: facturaData, logoUrl: '/logo-tufisti.png' })
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura-${f.serie}${f.folio}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('❌ Error al generar el PDF. Verifica que @react-pdf/renderer esté instalado.');
    } finally {
      setDescargando(null);
    }
  };

  const handleEnviarCorreo = async (correo: string) => {
    if (!facturaCorreo) return;
    setEnviando(true);
    setMsgCorreo('');
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { FacturaPDF } = await import('@/lib/pdf/FacturaPDF');
      const React = (await import('react')).default;

      const direccionReceptor = [
        facturaCorreo.client.calle,
        facturaCorreo.client.numExterior ? `#${facturaCorreo.client.numExterior}` : '',
        facturaCorreo.client.colonia,
        facturaCorreo.client.municipio,
        facturaCorreo.client.estado,
      ].filter(Boolean).join(', ');

      const facturaData = {
        folio: facturaCorreo.folio,
        serie: facturaCorreo.serie,
        fecha: fmtFecha(facturaCorreo.fecha),
        estado: facturaCorreo.estado,
        uuid: facturaCorreo.uuid,
        emisor: EMISOR,
        receptor: {
          nombre: facturaCorreo.client.nombreRazonSocial,
          rfc: facturaCorreo.client.rfc,
          direccion: direccionReceptor || undefined,
          cp: facturaCorreo.client.cp,
          usoCfdi: facturaCorreo.client.usoCfdiDefault,
          regimenFiscal: facturaCorreo.client.regimenFiscal,
        },
        conceptos: facturaCorreo.conceptos.map(c => ({
          claveProdServ: c.claveProdServ || '01010101',
          cantidad: Number(c.cantidad),
          claveUnidad: c.claveUnidad || 'H87',
          descripcion: c.descripcion,
          valorUnitario: Number(c.precioUnitario ?? (Number(c.importe) / Number(c.cantidad))),
          importe: Number(c.importe),
        })),
        subtotal: Number(facturaCorreo.subtotal),
        iva: Number(facturaCorreo.totalIVA),
        total: Number(facturaCorreo.total),
        moneda: facturaCorreo.moneda || 'MXN - Peso Mexicano',
        formaPago: facturaCorreo.formaPago,
        metodoPago: facturaCorreo.metodoPago,
      };

      const blob = await pdf(
        React.createElement(FacturaPDF, { factura: facturaData, logoUrl: '/logo-tufisti.png' })
      ).toBlob();

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch(`/api/facturas/${facturaCorreo.id}/enviar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destinatario: correo, pdfBase64: base64 }),
        });
        const data = await res.json();
        setMsgCorreo(data.ok ? `✅ ${data.mensaje}` : `❌ ${data.error}`);
        setEnviando(false);
        if (data.ok) setTimeout(() => { setFacturaCorreo(null); setMsgCorreo(''); }, 2000);
      };
    } catch (err) {
      console.error('Error:', err);
      setMsgCorreo('❌ Error al generar o enviar el PDF');
      setEnviando(false);
    }
  };

  // ── Cancelar factura ──────────────────────────────────────────────────────
  const handleCancelar = async (f: Factura, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Cancelar la factura ${f.serie}-${f.folio}?\nEsta acción no se puede deshacer.`)) return;
    setCancelando(f.id);
    try {
      const res = await fetch(`/api/facturas/${f.id}/cancelar`, { method: 'PATCH' });
      if (res.ok) {
        await cargar();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`❌ ${err.error || 'No se pudo cancelar la factura'}`);
      }
    } catch {
      alert('❌ Error de conexión al cancelar');
    } finally {
      setCancelando(null);
    }
  };

  const totalGeneral = facturas
    .filter(f => f.estado !== 'CANCELADO')
    .reduce((acc, f) => acc + Number(f.total), 0);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      {facturaCorreo && (
        <ModalCorreo
          factura={facturaCorreo}
          onClose={() => { setFacturaCorreo(null); setMsgCorreo(''); }}
          onEnviar={handleEnviarCorreo}
          enviando={enviando}
          mensaje={msgCorreo}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Facturas</h1>
          <Link
            href="/facturas/nueva"
            className="ml-auto flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-200"
          >
            <PlusCircle className="w-4 h-4" /> Nueva Factura
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total facturas', value: facturas.length, color: 'text-slate-700' },
            { label: 'Borradores', value: facturas.filter(f => f.estado === 'BORRADOR').length, color: 'text-amber-600' },
            { label: 'Timbradas', value: facturas.filter(f => f.estado === 'TIMBRADO').length, color: 'text-green-600' },
            { label: 'Monto total', value: fmt(totalGeneral), color: 'text-blue-700' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">{k.label}</div>
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por serie o folio..."
                className="w-full pl-9 p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400">Estado</label>
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="p-2.5 border rounded-xl bg-slate-50 outline-none text-sm"
              >
                <option value="">Todos</option>
                <option value="BORRADOR">Borrador</option>
                <option value="TIMBRADO">Timbrado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="p-2.5 border rounded-xl bg-slate-50 outline-none text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="p-2.5 border rounded-xl bg-slate-50 outline-none text-sm" />
            </div>
            {(q || filtroEstado || desde || hasta) && (
              <button
                onClick={() => { setQ(''); setFiltroEstado(''); setDesde(''); setHasta(''); }}
                className="p-2.5 border border-red-200 text-red-400 rounded-xl hover:bg-red-50 text-sm"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando facturas...
            </div>
          ) : facturas.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">No se encontraron facturas</p>
              <Link href="/facturas/nueva" className="mt-4 inline-block text-blue-600 text-sm font-bold hover:underline">
                + Crear primera factura
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Serie/Folio', 'Fecha', 'Cliente', 'RFC', 'Conceptos', 'Subtotal', 'IVA', 'Total', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturas.map(f => (
                  <React.Fragment key={f.id}>
                    <tr
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setExpandida(expandida === f.id ? null : f.id)}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">{f.serie}-{f.folio}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtFecha(f.fecha)}</td>
                      <td className="px-4 py-3 font-medium max-w-[180px] truncate">{f.client.nombreRazonSocial}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{f.client.rfc}</td>
                      <td className="px-4 py-3 text-slate-500">{f.conceptos.length} concepto{f.conceptos.length !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3 font-mono">{fmt(Number(f.subtotal))}</td>
                      <td className="px-4 py-3 font-mono text-orange-500">{fmt(Number(f.totalIVA))}</td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-900">{fmt(Number(f.total))}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${ESTADO_BADGE[f.estado] || 'bg-slate-100 text-slate-500'}`}>
                          {f.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            title="Ver detalle"
                            onClick={() => setExpandida(expandida === f.id ? null : f.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Descargar PDF"
                            onClick={(e) => handleDescargar(f, e)}
                            disabled={descargando === f.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            {descargando === f.id
                              ? <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                              : <Download className="w-4 h-4" />
                            }
                          </button>
                          <button
                            title="Enviar por correo"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFacturaCorreo(f);
                              setMsgCorreo('');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          {/* ── Botón Cancelar ── */}
                          {f.estado !== 'CANCELADO' && (
                            <button
                              title="Cancelar factura"
                              onClick={(e) => handleCancelar(f, e)}
                              disabled={cancelando === f.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {cancelando === f.id
                                ? <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                : <Ban className="w-4 h-4" />
                              }
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandida === f.id && (
                      <tr key={`${f.id}-detail`} className="bg-blue-50/40">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="text-xs font-bold uppercase text-slate-400 mb-2">Conceptos</div>
                            {f.conceptos.map((c, i) => (
                              <div key={i} className="flex justify-between text-sm text-slate-600 bg-white rounded-xl px-4 py-2 border border-slate-100">
                                <span>{c.descripcion}</span>
                                <span className="font-mono text-slate-400">x{Number(c.cantidad)}</span>
                                <span className="font-mono font-bold">{fmt(Number(c.importe))}</span>
                              </div>
                            ))}
                            {f.notas && (
                              <div className="text-xs text-slate-400 mt-2 italic">📝 {f.notas}</div>
                            )}
                            {f.uuid && (
                              <div className="text-xs font-mono text-green-600 mt-1">UUID: {f.uuid}</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}