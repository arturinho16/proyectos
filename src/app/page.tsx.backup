import Link from 'next/link';
import { Users, Package, FileText, BarChart3, PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="p-8 bg-gray-50 min-h-screen text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* Encabezado */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-blue-900">Panel de Control</h1>
          <p className="text-gray-500 mt-2">Bienvenido al sistema de autofacturación México.</p>
        </div>

        {/* Accesos Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Card: Nueva Factura */}
          <Link href="/facturas/nueva" className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white hover:bg-blue-700 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <FileText className="w-10 h-10 opacity-80" />
              <PlusCircle className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-xl font-bold">Nueva Factura</h3>
            <p className="text-blue-100 text-sm mt-1">Generar CFDI 4.0 al instante.</p>
          </Link>

          {/* Card: Clientes */}
          <Link href="/catalogos/clientes" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-400 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Clientes</h3>
            <p className="text-gray-500 text-sm mt-1">Gestionar catálogo de receptores.</p>
          </Link>

          {/* Card: Productos */}
          <Link href="/catalogos/productos" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-400 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <Package className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Productos</h3>
            <p className="text-gray-500 text-sm mt-1">Servicios y conceptos de facturación.</p>
          </Link>

        </div>

        {/* Sección de Estadísticas Rápidas (Simuladas) */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">Resumen Mensual</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="border-r border-gray-100 last:border-0">
              <p className="text-xs font-bold text-gray-400 uppercase">Facturas Emitidas</p>
              <p className="text-3xl font-bold text-blue-900">0</p>
            </div>
            <div className="border-r border-gray-100 last:border-0">
              <p className="text-xs font-bold text-gray-400 uppercase">Total Facturado</p>
              <p className="text-3xl font-bold text-green-600">$0.00</p>
            </div>
            <div className="border-r border-gray-100 last:border-0">
              <p className="text-xs font-bold text-gray-400 uppercase">Clientes Activos</p>
              <p className="text-3xl font-bold text-gray-800">0</p>
            </div>
            <div className="border-r border-gray-100 last:border-0">
              <p className="text-xs font-bold text-gray-400 uppercase">Pendientes de Pago</p>
              <p className="text-3xl font-bold text-orange-500">0</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
