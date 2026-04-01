'use client';

import { useState, useEffect } from 'react';
import { FileText, PlusCircle, Search, Trash2, Edit2, FileCheck2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Client = { nombreRazonSocial: string; rfc: string; };
type Cotizacion = { id: string; serie: string; folio: string; fecha: string; total: number; moneda: string; estado: string; client: Client; };

export default function CotizacionesPage() {
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscador y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  const fetchCotizaciones = async () => {
    try { const res = await fetch('/api/cotizaciones'); const data = await res.json(); setCotizaciones(Array.isArray(data) ? data : []); }
    catch (error) { console.error("Error cargando cotizaciones:", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCotizaciones(); }, []);
  useEffect(() => { setPaginaActual(1); }, [searchTerm]);

  const handleDelete = async (id: string, folioCompleto: string) => {
    if (!confirm(`¿Estás seguro de eliminar la cotización ${folioCompleto}?`)) return;
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCotizaciones(); else { const data = await res.json(); alert(`❌ Error: ${data.error}`); }
    } catch (error) { alert('❌ Error de conexión al eliminar'); }
  };

  const handleFacturar = (id: string) => { router.push(`/facturas/nueva?cotizacionId=${id}`); };
  const handleEditar = (id: string) => { router.push(`/cotizaciones/${id}/editar`); };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'FACTURADA': return <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-purple-200">Facturada</span>;
      case 'ACEPTADA': return <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-green-200">Aceptada</span>;
      case 'RECHAZADA': return <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-red-200">Rechazada</span>;
      default: return <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200">Borrador</span>;
    }
  };

  // Lógica de filtrado y paginación
  const filteredCotizaciones = cotizaciones.filter(c =>
    c.client?.nombreRazonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.client?.rfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.folio.includes(searchTerm) ||
    c.serie.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPaginas = Math.ceil(filteredCotizaciones.length / ITEMS_POR_PAGINA);
  const startIndex = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const cotizacionesPaginadas = filteredCotizaciones.slice(startIndex, startIndex + ITEMS_POR_PAGINA);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-base transition-colors mr-2"><ArrowLeft className="w-5 h-5" /> Panel</Link>
            <FileCheck2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Cotizaciones</h1>
          </div>
          <Link href="/cotizaciones/nueva" className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 text-base">
            <PlusCircle className="w-5 h-5" /> Nueva Cotización
          </Link>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
          <Search className="w-6 h-6 text-slate-400" />
          <input type="text" placeholder="Buscar por cliente, RFC, folio o serie..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full outline-none text-slate-700 bg-transparent text-base" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] text-base">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-sm uppercase tracking-wider border-b border-slate-200"><th className="p-5 font-bold">Folio</th><th className="p-5 font-bold">Cliente</th><th className="p-5 font-bold">Fecha</th><th className="p-5 font-bold text-right">Total</th><th className="p-5 font-bold text-center">Estado</th><th className="p-5 font-bold text-center">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (<tr><td colSpan={6} className="p-10 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />Cargando...</td></tr>)
                  : filteredCotizaciones.length === 0 ? (<tr><td colSpan={6} className="p-10 text-center text-slate-400">No se encontraron cotizaciones.</td></tr>)
                    : (cotizacionesPaginadas.map((cot) => (
                      <tr key={cot.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-5"><div className="font-bold text-blue-900">{cot.serie}-{cot.folio}</div><div className="text-sm text-slate-400 font-mono mt-1">{cot.id.split('-')[0]}...</div></td>
                        <td className="p-5"><div className="font-bold text-slate-800">{cot.client?.nombreRazonSocial || 'Sin cliente'}</div><div className="text-sm text-slate-500 font-mono mt-1">{cot.client?.rfc || 'N/A'}</div></td>
                        <td className="p-5 text-slate-600">{new Date(cot.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="p-5 text-right font-mono font-bold text-slate-700">${Number(cot.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-slate-400">{cot.moneda}</span></td>
                        <td className="p-5 text-center">{getStatusBadge(cot.estado)}</td>
                        <td className="p-5 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {cot.estado !== 'FACTURADA' && <button onClick={() => handleFacturar(cot.id)} className="text-purple-600 hover:text-purple-800 hover:bg-purple-100 p-2 rounded-lg transition-colors border border-transparent hover:border-purple-200" title="Convertir a Factura"><FileText className="w-5 h-5" /></button>}
                            <button onClick={() => handleEditar(cot.id)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 p-2 rounded-lg transition-colors" title="Ver / Editar"><Edit2 className="w-5 h-5" /></button>
                            <button onClick={() => handleDelete(cot.id, `${cot.serie}-${cot.folio}`)} className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </td>
                      </tr>
                    )))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 bg-slate-50 mt-auto">
              <span className="text-sm text-slate-500 font-medium">Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_POR_PAGINA, filteredCotizaciones.length)} de {filteredCotizaciones.length}</span>
              <div className="flex gap-2">
                <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors">Anterior</button>
                <div className="flex items-center justify-center px-4 font-bold text-slate-700 text-sm">Página {paginaActual} de {totalPaginas}</div>
                <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}