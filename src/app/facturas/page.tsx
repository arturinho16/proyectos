'use client';

import { useState, useEffect } from 'react';

import { FileText, PlusCircle, Search, Eye, Download, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';

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
  client: { nombreRazonSocial: string; rfc: string };
  conceptos: { descripcion: string; cantidad: number; importe: number }[];
};

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: 'bg-slate-100 text-slate-600',
  TIMBRADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-600',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtFecha = (d: string) =>
  new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [expandida, setExpandida] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null); // id de factura en proceso de envío

  const handleDescargar = async (f: Factura, e: React.MouseEvent) => {
    e.stopPropagation();
    // Por ahora abre una ventana de impresión con los datos de la factura
    // Cuando tengas PDF generado, aquí irá: window.open(f.pdfUrl)
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Factura ${f.serie}-${f.folio}</title>
      <style>body{font-family:sans-serif;padding:2rem}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}th{background:#f5f5f5}</style>
      </head><body>
      <h2>Factura ${f.serie}-${f.folio}</h2>
      <p><b>Cliente:</b> ${f.client.nombreRazonSocial} (${f.client.rfc})</p>
      <p><b>Fecha:</b> ${fmtFecha(f.fecha)} | <b>Estado:</b> ${f.estado}</p>
      ${f.uuid ? `<p><b>UUID:</b> ${f.uuid}</p>` : ''}
      <table><thead><tr><th>Descripción</th><th>Cantidad</th><th>Importe</th></tr></thead>
      <tbody>${f.conceptos.map(c => `<tr><td>${c.descripcion}</td><td>${Number(c.cantidad)}</td><td>${fmt(Number(c.importe))}</td></tr>`).join('')}</tbody>
      </table>
      <br/><p><b>Subtotal:</b> ${fmt(Number(f.subtotal))} | <b>IVA:</b> ${fmt(Number(f.totalIVA))} | <b>Total:</b> ${fmt(Number(f.total))}</p>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    win.document.close();
  };

  const handleEnviarCorreo = async (f: Factura, e: React.MouseEvent) => {
    e.stopPropagation();
    const correo = prompt(`Enviar factura ${f.serie}-${f.folio} a:`);
    if (!correo) return;
    setEnviando(f.id);
    try {
      const res = await fetch(`/api/facturas/${f.id}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo }),
      });
      if (res.ok) alert(`✅ Factura enviada a ${correo}`);
      else alert('❌ Error al enviar el correo');
    } catch {
      alert('❌ Error de conexión');
    } finally {
      setEnviando(null);
    }
  };

  const cargar = async () => {
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
  };

  useEffect(() => { cargar(); }, [q, filtroEstado, desde, hasta]);

  // Totales del filtro actual
  const totalGeneral = facturas
    .filter(f => f.estado !== 'CANCELADO')
    .reduce((acc, f) => acc + Number(f.total), 0);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
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
            { label: 'Borradores', value: facturas.filter(f => f.estado === 'BORRADOR').length, color: 'text-slate-500' },
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
            <div className="p-12 text-center text-slate-400">Cargando facturas...</div>
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
                  <>
                    <tr
                      key={f.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setExpandida(expandida === f.id ? null : f.id)}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">
                        {f.serie}-{f.folio}
                      </td>
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
                          {/* Ver detalle */}
                          <button
                            title="Ver detalle"
                            onClick={() => setExpandida(expandida === f.id ? null : f.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Descargar / Imprimir */}
                          <button
                            title="Descargar / Imprimir"
                            onClick={(e) => handleDescargar(f, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {/* Enviar por correo */}
                          <button
                            title="Enviar por correo"
                            onClick={(e) => handleEnviarCorreo(f, e)}
                            disabled={enviando === f.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50"
                          >
                            {enviando === f.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Mail className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Fila expandida con conceptos */}
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
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
