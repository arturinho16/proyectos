'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Package, FileText, BarChart3, PlusCircle, Receipt, FileCheck, Menu, X } from 'lucide-react';

interface ResumenMensual {
  facturasEmitidas: number;
  totalFacturado: number;
  clientesActivos: number;
  pendientesPago: number;
}

export default function DashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resumen, setResumen] = useState<ResumenMensual>({
    facturasEmitidas: 0,
    totalFacturado: 0,
    clientesActivos: 0,
    pendientesPago: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarResumen() {
      try {
        // Rango del mes actual
        const ahora = new Date();
        const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
        const hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const [facturasRes, clientesRes] = await Promise.all([
          fetch(`/api/facturas?desde=${desde}&hasta=${hasta}`),
          fetch('/api/clients'),
        ]);

        const facturas = await facturasRes.json();
        const clientes = await clientesRes.json();

        const emitidas = facturas.filter((f: any) => f.estado !== 'CANCELADA');
        const totalFacturado = emitidas.reduce((sum: number, f: any) => sum + (f.total || 0), 0);
        const pendientesPago = facturas.filter((f: any) =>
          f.estado === 'BORRADOR' || f.estado === 'ENVIADA'
        ).length;

        setResumen({
          facturasEmitidas: emitidas.length,
          totalFacturado,
          clientesActivos: Array.isArray(clientes) ? clientes.length : 0,
          pendientesPago,
        });
      } catch (err) {
        console.error('Error cargando resumen:', err);
      } finally {
        setLoading(false);
      }
    }

    cargarResumen();
  }, []);

  const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  const kpis = [
    { label: 'Facturas Emitidas', value: loading ? '…' : String(resumen.facturasEmitidas), color: 'text-blue-700' },
    { label: 'Total Facturado', value: loading ? '…' : formatMXN(resumen.totalFacturado), color: 'text-green-600' },
    { label: 'Clientes Activos', value: loading ? '…' : String(resumen.clientesActivos), color: 'text-slate-800' },
    { label: 'Pendientes de Pago', value: loading ? '…' : String(resumen.pendientesPago), color: 'text-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white shadow-md flex-shrink-0">
              <Image
                src="/tufisti-circular.png"
                alt="Tufisti Logo"
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl leading-tight">Tufisti</h1>
              <p className="text-blue-200 text-xs hidden sm:block">Sistema de Autofacturación CFDI 4.0</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/facturas/nueva"
              className="hidden sm:flex items-center gap-2 bg-white text-blue-700 font-bold px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-all text-sm shadow"
            >
              <PlusCircle className="w-4 h-4" /> Nueva Factura
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Nav desktop ── */}
        <div className="hidden sm:block border-t border-blue-500/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex overflow-x-auto">
            <Link href="/" className="flex items-center gap-1.5 px-4 py-3 text-white bg-white/20 border-b-2 border-white text-sm font-bold whitespace-nowrap">
              <BarChart3 className="w-4 h-4" /> Panel
            </Link>
            <Link href="/facturas" className="flex items-center gap-1.5 px-4 py-3 text-blue-100 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors whitespace-nowrap">
              <Receipt className="w-4 h-4" /> Facturas
            </Link>
            <Link href="/catalogos/clientes" className="flex items-center gap-1.5 px-4 py-3 text-blue-100 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors whitespace-nowrap">
              <Users className="w-4 h-4" /> Clientes
            </Link>
            <Link href="/catalogos/productos" className="flex items-center gap-1.5 px-4 py-3 text-blue-100 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors whitespace-nowrap">
              <Package className="w-4 h-4" /> Productos
            </Link>
            <span className="flex items-center gap-1.5 px-4 py-3 text-blue-100 text-sm font-medium whitespace-nowrap opacity-50 cursor-not-allowed">
              <FileCheck className="w-4 h-4" /> Cotizaciones
            </span>
          </div>
        </div>

        {/* ── Nav móvil (hamburguesa) ── */}
        {menuOpen && (
          <div className="sm:hidden border-t border-blue-500/40 bg-blue-700">
            <nav className="flex flex-col">
              <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-4 text-white bg-white/20 font-bold border-b border-blue-500/30">
                <BarChart3 className="w-5 h-5" /> Panel
              </Link>
              <Link href="/facturas/nueva" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-4 text-blue-100 hover:bg-white/10 font-medium border-b border-blue-500/30">
                <PlusCircle className="w-5 h-5" /> Nueva Factura
              </Link>
              <Link href="/facturas" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-4 text-blue-100 hover:bg-white/10 font-medium border-b border-blue-500/30">
                <Receipt className="w-5 h-5" /> Facturas
              </Link>
              <Link href="/catalogos/clientes" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-4 text-blue-100 hover:bg-white/10 font-medium border-b border-blue-500/30">
                <Users className="w-5 h-5" /> Clientes
              </Link>
              <Link href="/catalogos/productos" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-4 text-blue-100 hover:bg-white/10 font-medium border-b border-blue-500/30">
                <Package className="w-5 h-5" /> Productos
              </Link>
              <div className="flex items-center gap-3 px-5 py-4 text-blue-300 opacity-60 border-b border-blue-500/30">
                <FileCheck className="w-5 h-5" /> Cotizaciones
                <span className="ml-auto text-xs bg-blue-500/40 px-2 py-0.5 rounded-full">Próximo</span>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── Contenido ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Panel de Control</h2>
          <p className="text-slate-500 mt-1 text-sm">Bienvenido al sistema de autofacturación México.</p>
        </div>

        {/* ── Accesos Rápidos ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <Link href="/facturas/nueva" className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 sm:p-6 rounded-2xl shadow-lg shadow-blue-200 text-white hover:from-blue-700 hover:to-blue-800 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <PlusCircle className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold">Nueva Factura</h3>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">Generar CFDI 4.0 al instante.</p>
          </Link>

          <Link href="/catalogos/clientes" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-emerald-500 border border-slate-200 hover:shadow-md transition-all">
            <div className="mb-4">
              <div className="bg-emerald-50 p-2.5 rounded-xl inline-block">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Clientes</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Gestionar catálogo de receptores.</p>
          </Link>

          <Link href="/catalogos/productos" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-violet-500 border border-slate-200 hover:shadow-md transition-all">
            <div className="mb-4">
              <div className="bg-violet-50 p-2.5 rounded-xl inline-block">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-violet-600" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Productos</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Servicios y conceptos de facturación.</p>
          </Link>

          <Link href="/facturas" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-amber-500 border border-slate-200 hover:shadow-md transition-all">
            <div className="mb-4">
              <div className="bg-amber-50 p-2.5 rounded-xl inline-block">
                <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Facturas</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Historial, descarga y envío por correo.</p>
          </Link>

          {/* Cotizaciones — próximo */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-slate-300 border border-slate-200 opacity-60 cursor-not-allowed relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Próximo</div>
            <div className="mb-4">
              <div className="bg-slate-50 p-2.5 rounded-xl inline-block">
                <FileCheck className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-500">Cotizaciones</h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Módulo en desarrollo.</p>
          </div>

        </div>

        {/* ── Resumen Mensual ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base sm:text-lg font-bold">Resumen Mensual</h2>
            <span className="ml-auto text-xs text-slate-400">
              {new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
            {kpis.map(k => (
              <div key={k.label} className="p-4 sm:p-6">
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mb-1">{k.label}</p>
                <p className={`text-2xl sm:text-3xl font-bold ${k.color} ${loading ? 'animate-pulse' : ''}`}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}