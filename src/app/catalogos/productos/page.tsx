'use client';

import { useState, useEffect } from 'react';
import { Package, PlusCircle, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProductosPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}" del catálogo?`)) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProducts();
    else alert('Error al eliminar el producto');
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData)),
    });

    if (res.ok) {
      alert('✅ Producto guardado con éxito');
      e.target.reset();
      fetchProducts();
    } else {
      alert('❌ Error al guardar');
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mr-2">
              <ArrowLeft className="w-4 h-4" /> Panel
            </Link>
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Catálogo de Productos</h1>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-10">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-blue-900">
            <PlusCircle className="w-5 h-5" /> Nuevo Producto (CFDI 4.0)
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fila 1: Datos Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Nombre del Producto</label>
                <input name="nombre" className="w-full p-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Código Interno (SKU)</label>
                <input name="codigoInterno" className="w-full p-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Precio Unitario (Sin IVA)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                  <input name="precio" type="number" step="0.000001" className="w-full p-2.5 pl-7 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
              </div>
            </div>

            {/* Fila 2: Datos SAT Obligatorios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-blue-700">Clave Prod/Serv SAT</label>
                <input name="claveProdServ" placeholder="84111506" className="w-full p-2.5 border border-blue-200 rounded-xl bg-white outline-none" required />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-blue-700">Unidad de Medida</label>
                <select
                  name="unidad_combined"
                  className="w-full p-2.5 border border-blue-200 rounded-xl bg-white outline-none"
                  onChange={(e) => {
                    const [clave, nombre] = e.target.value.split('|');
                    (document.getElementById('claveUnidad') as HTMLInputElement).value = clave;
                    (document.getElementById('unidad') as HTMLInputElement).value = nombre;
                  }}
                >
                  <option value="H87|Pieza">H87 - Pieza</option>
                  <option value="E48|Unidad de servicio">E48 - Unidad de servicio</option>
                  <option value="ACT|Actividad">ACT - Actividad</option>
                  <option value="KGM|Kilogramo">KGM - Kilogramo</option>
                  <option value="MTR|Metro">MTR - Metro</option>
                  <option value="XPK|Paquete">XPK - Paquete</option>
                  <option value="LTR|Litro">LTR - Litro</option>
                </select>
                <input type="hidden" name="claveUnidad" id="claveUnidad" defaultValue="H87" />
                <input type="hidden" name="unidad" id="unidad" defaultValue="Pieza" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-blue-700">Objeto Impuesto</label>
                <select name="objetoImpuesto" className="w-full p-2.5 border border-blue-200 rounded-xl bg-white outline-none">
                  <option value="02">02 - Sí objeto de impuesto</option>
                  <option value="01">01 - No objeto de impuesto</option>
                  <option value="03">03 - Sí objeto no obligado</option>
                </select>
              </div>
            </div>

            {/* Fila 3: Impuestos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Tasa IVA</label>
                <select name="ivaTasa" className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none">
                  <option value="0.16">IVA 16%</option>
                  <option value="0.08">IVA 8% (Frontera)</option>
                  <option value="0.00">IVA 0%</option>
                  <option value="0.00">Exento</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Tasa IEPS (Opcional)</label>
                <input name="iepsTasa" type="number" step="0.01" defaultValue="0.00" className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                  Guardar en Catálogo
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Tabla de Productos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Producto / Claves SAT</th>
                <th className="p-4 font-bold text-right">Precio Base</th>
                <th className="p-4 font-bold text-right">IVA</th>
                <th className="p-4 font-bold text-right">Total</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-400">Cargando catálogo...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-400">No hay productos registrados</td></tr>
              ) : (
                products.map((p: any) => {
                  const precio = Number(p.precio) || 0;
                  const iva = precio * Number(p.ivaTasa);
                  const total = precio + iva;
                  return (
                    <tr key={p.id} className="border-t hover:bg-blue-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-blue-900">{p.nombre}</div>
                        <div className="text-[10px] flex gap-2 mt-1">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">SAT: {p.claveProdServ}</span>
                          <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-600">Unidad: {p.claveUnidad}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-600">${precio.toFixed(2)}</td>
                      <td className="p-4 text-right font-mono text-orange-500">${iva.toFixed(2)}</td>
                      <td className="p-4 text-right font-mono font-bold text-green-600">${total.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDelete(p.id, p.nombre)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                          title="Eliminar producto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}