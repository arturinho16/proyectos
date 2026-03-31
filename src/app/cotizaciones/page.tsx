'use client';

import { useState, useEffect } from 'react';
import { FileText, PlusCircle, Search, Trash2, Edit2, FileCheck2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Client = {
  nombreRazonSocial: string;
  rfc: string;
};

type Cotizacion = {
  id: string;
  serie: string;
  folio: string;
  fecha: string;
  total: number;
  moneda: string;
  estado: string;
  client: Client;
};

export default function CotizacionesPage() {
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCotizaciones = async () => {
    try {
      const res = await fetch('/api/cotizaciones');
      const data = await res.json();
      setCotizaciones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando cotizaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCotizaciones();
  }, []);

  // ─── LÓGICA DE ELIMINAR CONECTADA ─────────────────────────────────────
  const handleDelete = async (id: string, folioCompleto: string) => {
    if (!confirm(`¿Estás seguro de eliminar la cotización ${folioCompleto}? Esta acción no se puede deshacer.`)) return;

    try {
      const res = await fetch(`/api/cotizaciones/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCotizaciones(); // Recarga la tabla mágicamente
      } else {
        const data = await res.json();
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert('❌ Error de conexión al eliminar');
    }
  };

  const handleFacturar = (id: string) => {
    // Viajamos a Nueva Factura llevándonos el ID en la URL
    router.push(`/facturas/nueva?cotizacionId=${id}`);
  };
  //boton editar
  const handleEditar = (id: string) => {
    router.push(`/cotizaciones/${id}/editar`);
  };
  // Filtrado básico
  const filteredCotizaciones = cotizaciones.filter(c =>
    c.client?.nombreRazonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.folio.includes(searchTerm) ||
    c.serie.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'FACTURADA': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-200">Facturada</span>;
      case 'ACEPTADA': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">Aceptada</span>;
      case 'RECHAZADA': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">Rechazada</span>;
      default: return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">Borrador</span>;
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mr-2">
                <ArrowLeft className="w-4 h-4" /> Panel
              </Link>
              <FileCheck2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-slate-800">Cotizaciones</h1>
            </div>
            <p className="text-slate-500 text-sm">Gestiona tus presupuestos y conviértelos en facturas.</p>
          </div>
          <Link
            href="/cotizaciones/nueva"
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <PlusCircle className="w-5 h-5" />
            Nueva Cotización
          </Link>
        </div>

        {/* Buscador */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, folio o serie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none text-slate-700 bg-transparent"
          />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold">Folio</th>
                  <th className="p-4 font-bold">Cliente</th>
                  <th className="p-4 font-bold">Fecha</th>
                  <th className="p-4 font-bold text-right">Total</th>
                  <th className="p-4 font-bold text-center">Estado</th>
                  <th className="p-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                      Cargando cotizaciones...
                    </td>
                  </tr>
                ) : filteredCotizaciones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400">
                      No se encontraron cotizaciones. ¡Crea la primera!
                    </td>
                  </tr>
                ) : (
                  filteredCotizaciones.map((cot) => (
                    <tr key={cot.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-blue-900">{cot.serie}-{cot.folio}</div>
                        <div className="text-xs text-slate-400 font-mono">{cot.id.split('-')[0]}...</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{cot.client?.nombreRazonSocial || 'Sin cliente'}</div>
                        <div className="text-xs text-slate-500 font-mono">{cot.client?.rfc || 'N/A'}</div>
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        {new Date(cot.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-700">
                        ${Number(cot.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">{cot.moneda}</span>
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(cot.estado)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                          {/* Botón Facturar */}
                          {cot.estado !== 'FACTURADA' && (
                            <button
                              onClick={() => handleFacturar(cot.id)}
                              className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-2 rounded-lg transition-all border border-transparent hover:border-purple-200"
                              title="Convertir a Factura"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          {/* Botón Editar/Previsualizar (ESTE ES EL QUE TE FALTA) */}
                          <button onClick={() => handleEditar(cot.id)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-all" title="Ver / Editar Cotización">
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Botón Eliminar */}
                          <button onClick={() => handleDelete(cot.id, `${cot.serie}-${cot.folio}`)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}