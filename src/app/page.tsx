'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Users, Package, FileText, BarChart3, PlusCircle, Receipt,
  FileCheck, Menu, X, Globe, Calendar, PieChart as PieChartIcon,
  TrendingUp, LayoutPanelLeft, LogOut, Archive, Settings, Inbox
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';

// ─── Interfaces ───────────────────────────────────────────────────────────
interface ResumenMensual {
  facturasTimbradas: number;
  facturasNoTimbradas: number;
  facturasCanceladas: number;
  dineroTimbrado: number;
  topCliente: string;
}

interface DatosDiarios {
  dia: string;
  monto: number;
  cantidad: number;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const COLORES_ESTADO = {
  Timbradas: '#16a34a', // Verde
  Borradores: '#d97706', // Ámbar
  Canceladas: '#dc2626'  // Rojo
};

export default function DashboardPage() {
  const router = useRouter();

  // Hook de inactividad (15 minutos)
  useInactivityTimeout(15);

  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Controles del Dashboard
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anioActual] = useState(new Date().getFullYear());
  const [vistaGrafico, setVistaGrafico] = useState<'barras' | 'pastel' | 'lineas'>('barras');

  // Datos calculados
  const [resumen, setResumen] = useState<ResumenMensual>({
    facturasTimbradas: 0,
    facturasNoTimbradas: 0,
    facturasCanceladas: 0,
    dineroTimbrado: 0,
    topCliente: '-',
  });

  const [datosEstado, setDatosEstado] = useState<any[]>([]);
  const [datosDiarios, setDatosDiarios] = useState<DatosDiarios[]>([]);

  useEffect(() => {
    async function cargarResumen() {
      setLoading(true);
      try {
        const desde = new Date(anioActual, mesSeleccionado, 1).toISOString();
        const hasta = new Date(anioActual, mesSeleccionado + 1, 0, 23, 59, 59).toISOString();

        const res = await fetch(`/api/facturas?desde=${desde}&hasta=${hasta}`);
        const facturas = await res.json();

        // Clasificación de estados
        const timbradas = facturas.filter((f: any) => f.estado === 'TIMBRADO' || f.estado === 'ENVIADA');
        const noTimbradas = facturas.filter((f: any) => f.estado === 'BORRADOR');
        const canceladas = facturas.filter((f: any) => f.estado === 'CANCELADO' || f.estado === 'CANCELADA');

        // Dinero Total Timbrado
        const dineroTimbrado = timbradas.reduce((sum: number, f: any) => sum + parseFloat(f.total || '0'), 0);

        // Cliente con más facturas válidas
        const conteoClientes: Record<string, number> = {};
        timbradas.forEach((f: any) => {
          const nombre = f.client?.nombreRazonSocial || 'Desconocido';
          conteoClientes[nombre] = (conteoClientes[nombre] || 0) + 1;
        });

        let topCliente = '-';
        let maxFacturas = 0;
        for (const [nombre, conteo] of Object.entries(conteoClientes)) {
          if (conteo > maxFacturas) {
            maxFacturas = conteo;
            topCliente = nombre;
          }
        }

        if (topCliente.length > 20) topCliente = topCliente.substring(0, 20) + '...';

        setResumen({
          facturasTimbradas: timbradas.length,
          facturasNoTimbradas: noTimbradas.length,
          facturasCanceladas: canceladas.length,
          dineroTimbrado,
          topCliente: maxFacturas > 0 ? topCliente : 'Sin datos',
        });

        setDatosEstado([
          { name: 'Timbradas', cantidad: timbradas.length, fill: COLORES_ESTADO.Timbradas },
          { name: 'No Timbradas', cantidad: noTimbradas.length, fill: COLORES_ESTADO.Borradores },
          { name: 'Canceladas', cantidad: canceladas.length, fill: COLORES_ESTADO.Canceladas },
        ]);

        const diasDelMes = new Date(anioActual, mesSeleccionado + 1, 0).getDate();
        const diario: DatosDiarios[] = Array.from({ length: diasDelMes }, (_, i) => ({
          dia: `${i + 1}`,
          monto: 0,
          cantidad: 0
        }));

        timbradas.forEach((f: any) => {
          const dia = new Date(f.fecha).getDate();
          if (diario[dia - 1]) {
            diario[dia - 1].monto += parseFloat(f.total || '0');
            diario[dia - 1].cantidad += 1;
          }
        });
        setDatosDiarios(diario);

      } catch (err) {
        console.error('Error cargando resumen:', err);
      } finally {
        setLoading(false);
      }
    }

    cargarResumen();
  }, [mesSeleccionado, anioActual]);

  const formatMXN = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  // Función de Logout (ahora sí, correctamente dentro del componente)
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const kpis = [
    { label: 'Timbradas Emitidas', value: loading ? '…' : String(resumen.facturasTimbradas), color: 'text-green-600' },
    { label: 'Dinero Timbrado', value: loading ? '…' : formatMXN(resumen.dineroTimbrado), color: 'text-blue-700' },
    { label: 'NO Timbradas', value: loading ? '…' : String(resumen.facturasNoTimbradas), color: 'text-amber-500' },
    { label: 'Canceladas', value: loading ? '…' : String(resumen.facturasCanceladas), color: 'text-red-500' },
    { label: 'Cliente Frecuente', value: loading ? '…' : resumen.topCliente, color: 'text-indigo-600', isText: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white shadow-md flex-shrink-0">
              <Image src="/tufisti-circular.png" alt="Tufisti Logo" width={48} height={48} className="object-cover w-full h-full" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl leading-tight">Tufisti</h1>
              <p className="text-blue-200 text-xs hidden sm:block">Sistema de Autofacturación CFDI 4.0</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/facturas/nueva" className="hidden sm:flex items-center gap-2 bg-white text-blue-700 font-bold px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-all text-sm shadow">
              <PlusCircle className="w-4 h-4" /> Nueva Factura
            </Link>
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 bg-red-500 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-red-600 transition-all text-sm shadow ml-2"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors">
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
            <Link href="/cotizaciones" className="flex items-center gap-1.5 px-4 py-3 text-blue-100 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors whitespace-nowrap">
              <FileCheck className="w-4 h-4" /> Cotizaciones
            </Link>
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
              <Link href="/cotizaciones" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-4 text-blue-100 hover:bg-white/10 font-medium border-b border-blue-500/30">
                <FileCheck className="w-5 h-5" /> Cotizaciones
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-5 py-4 text-red-300 hover:bg-white/10 font-medium border-b border-blue-500/30 text-left w-full"
              >
                <LogOut className="w-5 h-5" /> Cerrar Sesión
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* ── Contenido ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 pb-24">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Panel de Control</h2>
          <p className="text-slate-500 mt-1 text-sm">Bienvenido al sistema de autofacturación México.</p>
        </div>

        {/* ── Accesos Rápidos ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/facturas/nueva" className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 sm:p-6 rounded-2xl shadow-lg shadow-blue-200 text-white hover:from-blue-700 hover:to-blue-800 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-white/20 p-2.5 rounded-xl"><FileText className="w-6 h-6 sm:w-8 sm:h-8" /></div>
              <PlusCircle className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold">Nueva Factura</h3>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">Generar CFDI 4.0 al instante.</p>
          </Link>

          <Link href="/catalogos/clientes" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-emerald-500 border border-slate-200 hover:shadow-md transition-all">
            <div className="mb-4"><div className="bg-emerald-50 p-2.5 rounded-xl inline-block"><Users className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" /></div></div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Clientes</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Gestionar catálogo de receptores.</p>
          </Link>

          <Link href="/catalogos/productos" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-violet-500 border border-slate-200 hover:shadow-md transition-all">
            <div className="mb-4"><div className="bg-violet-50 p-2.5 rounded-xl inline-block"><Package className="w-6 h-6 sm:w-8 sm:h-8 text-violet-600" /></div></div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Productos</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Servicios y conceptos de facturación.</p>
          </Link>

          <Link href="/facturas" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-amber-500 border border-slate-200 hover:shadow-md transition-all">
            <div className="mb-4"><div className="bg-amber-50 p-2.5 rounded-xl inline-block"><Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" /></div></div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Facturas</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Historial, descarga y envío por correo.</p>
          </Link>

          <Link href="/cotizaciones" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-slate-400 border border-slate-200 hover:shadow-md transition-all group">
            <div className="mb-4"><div className="bg-slate-50 p-2.5 rounded-xl inline-block"><FileCheck className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600" /></div></div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Cotizaciones</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Gestionar y convertir a facturas.</p>
          </Link>

          <Link href="/facturas/global" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-indigo-500 border border-slate-200 hover:shadow-md transition-all group">
            <div className="mb-4">
              <div className="bg-indigo-50 p-2.5 rounded-xl inline-block">
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Factura Global</h3>
            <p className="text-slate-500 text-sm mt-1">Ventas al público en general del periodo.</p>
          </Link>
          <Link href="/facturas/consolidado" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-cyan-500 border border-slate-200 hover:shadow-md transition-all group">
            <div className="mb-4">
              <div className="bg-cyan-50 p-2.5 rounded-xl inline-block">
                <Archive className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-600" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Consolidado Mensual</h3>
            <p className="text-slate-500 text-sm mt-1">Cierre contable: Descarga 1 PDF global y ZIP de XMLs.</p>
          </Link>
          <Link href="/configuracion" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-slate-800 border border-slate-200 hover:shadow-md transition-all group">
            <div className="mb-4">
              <div className="bg-slate-100 p-2.5 rounded-xl inline-block">
                <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-slate-700" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Configuración</h3>
            <p className="text-slate-500 text-sm mt-1">Perfil fiscal, usuarios y certificados SAT.</p>
          </Link>
          <Link href="/facturas-recibidas" className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-l-pink-500 border border-slate-200 hover:shadow-md transition-all group">
            <div className="mb-4">
              <div className="bg-pink-50 p-2.5 rounded-xl inline-block">
                <Inbox className="w-6 h-6 sm:w-8 sm:h-8 text-pink-600" />
              </div>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Facturas Recibidas</h3>
            <p className="text-slate-500 text-sm mt-1">Gastos sincronizados desde el SAT.</p>
          </Link>

        </div>

        {/* ── Resumen Mensual con Filtro ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">Resumen de Operaciones</h2>
            </div>

            {/* Filtro de Meses */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              >
                {MESES.map((mes, index) => (
                  <option key={mes} value={index}>{mes} {anioActual}</option>
                ))}
              </select>
            </div>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-slate-100 border-b border-slate-100">
            {kpis.map((k, idx) => (
              <div key={idx} className="p-4 sm:p-6 flex flex-col justify-center">
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mb-1 leading-tight">{k.label}</p>
                <p className={`${k.isText ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} font-bold ${k.color} ${loading ? 'animate-pulse opacity-50' : ''} truncate`} title={String(k.value)}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Gráficos ── */}
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="text-base font-bold text-slate-700">Análisis Gráfico del Mes</h3>

              {/* Botones para cambiar de vista */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setVistaGrafico('barras')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${vistaGrafico === 'barras' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LayoutPanelLeft className="w-4 h-4" /> Barras
                </button>
                <button
                  onClick={() => setVistaGrafico('pastel')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${vistaGrafico === 'pastel' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <PieChartIcon className="w-4 h-4" /> Distribución
                </button>
                <button
                  onClick={() => setVistaGrafico('lineas')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${vistaGrafico === 'lineas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <TrendingUp className="w-4 h-4" /> Tendencia
                </button>
              </div>
            </div>

            <div className="h-[300px] w-full">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse">
                  <span className="text-slate-400 font-medium">Cargando gráficos...</span>
                </div>
              ) : (
                <>
                  {/* Vista 1: Barras */}
                  {vistaGrafico === 'barras' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datosEstado} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} maxBarSize={60}>
                          {datosEstado.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* Vista 2: Pastel / Dona */}
                  {vistaGrafico === 'pastel' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={datosEstado}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="cantidad"
                        >
                          {datosEstado.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', fontWeight: 600, color: '#475569' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}

                  {/* Vista 3: Líneas de Tendencia Mensual */}
                  {vistaGrafico === 'lineas' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={datosDiarios} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => [formatMXN(value), 'Monto Timbrado']}
                          labelFormatter={(label) => `Día ${label} de ${MESES[mesSeleccionado]}`}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="monto"
                          stroke="#2563eb"
                          strokeWidth={4}
                          dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, fill: '#1d4ed8' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}