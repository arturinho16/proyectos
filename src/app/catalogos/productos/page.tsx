'use client';

import { useState, useEffect, useRef } from 'react';
import { Package, PlusCircle, X, ArrowLeft, Upload, Edit2, Download, Search } from 'lucide-react';
import Link from 'next/link';

export default function ProductosPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Controles de interfaz
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Paginación y búsqueda general
  const [q, setQ] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 20;

  // ─── ESTADOS PARA EL AUTOCOMPLETADO DEL SAT ───
  const [claveProdServ, setClaveProdServ] = useState('');
  const [nombreProdServ, setNombreProdServ] = useState('');
  const [claveUnidad, setClaveUnidad] = useState('H87');
  const [nombreUnidad, setNombreUnidad] = useState('Pieza');
  const [sugerenciasSat, setSugerenciasSat] = useState<any[]>([]);
  const [campoActivoSat, setCampoActivoSat] = useState<'producto' | 'unidad' | null>(null);

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { setPaginaActual(1); }, [q]);

  // Función para buscar en el SAT
  const buscarClaveSat = async (query: string, tipo: 'producto' | 'unidad') => {
    if (query.length < 2) {
      setSugerenciasSat([]);
      setCampoActivoSat(null);
      return;
    }
    try {
      const res = await fetch(`/api/sat/busqueda?tipo=${tipo}&q=${query}`);
      const data = await res.json();
      setSugerenciasSat(data);
      setCampoActivoSat(tipo);
    } catch (error) {
      console.error("Error buscando clave SAT:", error);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}" del catálogo?`)) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProducts();
    else alert('Error al eliminar el producto');
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setClaveProdServ(product.claveProdServ || '');
    setNombreProdServ(product.nombre || 'Producto Editado');
    setClaveUnidad(product.claveUnidad || '');
    setNombreUnidad(product.unidad || '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setShowForm(false);
    setClaveProdServ('');
    setNombreProdServ('');
    setClaveUnidad('H87');
    setNombreUnidad('Pieza');
    setCampoActivoSat(null);
    formRef.current?.reset();
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data: any = Object.fromEntries(formData);

    // Inyectar datos del estado de React que no provienen directamente de inputs simples
    data.claveProdServ = claveProdServ;
    data.nombreProdServ = nombreProdServ;
    data.claveUnidad = claveUnidad;
    data.unidad = nombreUnidad;

    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { alert(editingProduct ? '✅ Producto actualizado' : '✅ Guardado con éxito'); cancelEdit(); fetchProducts(); }
    else { alert('❌ Error al guardar el producto'); }
  };

  const downloadTemplate = () => {
    const headers = "nombre,codigoInterno,precio,claveProdServ,claveUnidad,unidad,objetoImpuesto,ivaTasa,iepsTasa\n";
    const example = "Desarrollo web,WEB01,5000.00,81111500,E48,Unidad de servicio,02,0.16,0.00\n";
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_productos.csv'; a.click();
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploading(true); const text = await file.text();
    try {
      const res = await fetch('/api/products/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvData: text }) });
      if (res.ok) { alert('✅ Catálogo cargado exitosamente'); fetchProducts(); } else { const err = await res.json(); alert(`❌ Error: ${err.error}`); }
    } catch (error) { alert('❌ Error de conexión al subir archivo'); } finally { setIsUploading(false); e.target.value = ''; }
  };

  // Filtrado y Paginación
  const productosFiltrados = products.filter(p => {
    if (!q) return true;
    const busqueda = q.toLowerCase();
    return (p.nombre?.toLowerCase().includes(busqueda) || p.codigoInterno?.toLowerCase().includes(busqueda) || p.claveProdServ?.includes(busqueda));
  });
  const totalPaginas = Math.ceil(productosFiltrados.length / ITEMS_POR_PAGINA);
  const startIndex = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const productosPaginados = productosFiltrados.slice(startIndex, startIndex + ITEMS_POR_PAGINA);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-base transition-colors mr-2"><ArrowLeft className="w-5 h-5" /> Panel</Link>
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Catálogo de Productos</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={downloadTemplate} className="flex items-center gap-2 px-5 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors text-base"><Download className="w-5 h-5" /> Plantilla CSV</button>
            <label className={`flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors cursor-pointer text-base shadow-md ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="w-5 h-5" /> {isUploading ? 'Cargando...' : 'Cargar CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </label>
            <button onClick={() => { cancelEdit(); setShowForm(!showForm); }} className="flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 text-base">
              {showForm && !editingProduct ? <X className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
              {showForm && !editingProduct ? 'Cerrar Formulario' : 'Nuevo Producto'}
            </button>
          </div>
        </div>

        {/* Formulario (Colapsable) */}
        {showForm && (
          <div className={`bg-white p-8 rounded-2xl shadow-sm border mb-8 transition-colors ${editingProduct ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold flex items-center gap-2 ${editingProduct ? 'text-amber-600' : 'text-blue-900'}`}>
                {editingProduct ? <Edit2 className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto (CFDI 4.0)'}
              </h2>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" key={editingProduct?.id || 'new'}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1"><label>Nombre del Producto *</label><input name="nombre" defaultValue={editingProduct?.nombre} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required /></div>
                <div className="space-y-1"><label>Código Interno (SKU)</label><input name="codigoInterno" defaultValue={editingProduct?.codigoInterno} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="space-y-1">
                  <label>Precio Unitario (Sin IVA) *</label>
                  <div className="relative"><span className="absolute left-3 top-3 text-slate-400 font-bold">$</span><input name="precio" type="number" step="0.000001" defaultValue={editingProduct?.precio} className="w-full p-3 pl-8 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                {/* ─── AUTOCOMPLETADO CLAVE SAT ─── */}
                <div className="space-y-1 relative">
                  <label className="!text-blue-800 font-bold text-sm">Clave Prod/Serv SAT *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={claveProdServ}
                      onChange={(e) => {
                        setClaveProdServ(e.target.value);
                        buscarClaveSat(e.target.value, 'producto');
                      }}
                      onBlur={() => setTimeout(() => setCampoActivoSat(null), 200)}
                      placeholder="43202009"
                      className="w-1/3 p-3 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                    <input
                      type="text"
                      value={nombreProdServ}
                      readOnly
                      className="w-2/3 p-3 border border-blue-200 rounded-lg outline-none bg-slate-50 text-slate-500 text-sm truncate"
                      placeholder="Descripción SAT..."
                    />
                  </div>
                  {campoActivoSat === 'producto' && sugerenciasSat.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto left-0">
                      {sugerenciasSat.map((sat) => (
                        <li
                          key={sat.clave}
                          onClick={() => {
                            setClaveProdServ(sat.clave);
                            setNombreProdServ(sat.descripcion);
                            setCampoActivoSat(null);
                          }}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                        >
                          <div className="font-bold text-sm text-slate-800">{sat.clave}</div>
                          <div className="text-xs text-slate-500 truncate">{sat.descripcion}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* ─── AUTOCOMPLETADO UNIDAD SAT ─── */}
                <div className="space-y-1 relative">
                  <label className="!text-blue-800 font-bold text-sm">Unidad de Medida *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={claveUnidad}
                      onChange={(e) => {
                        setClaveUnidad(e.target.value);
                        buscarClaveSat(e.target.value, 'unidad');
                      }}
                      onBlur={() => setTimeout(() => setCampoActivoSat(null), 200)}
                      placeholder="H87"
                      className="w-1/3 p-3 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                      required
                    />
                    <input
                      type="text"
                      value={nombreUnidad}
                      readOnly
                      className="w-2/3 p-3 border border-blue-200 rounded-lg outline-none bg-slate-50 text-slate-500 text-sm truncate"
                    />
                  </div>
                  {campoActivoSat === 'unidad' && sugerenciasSat.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto left-0">
                      {sugerenciasSat.map((sat) => (
                        <li
                          key={sat.clave}
                          onClick={() => {
                            setClaveUnidad(sat.clave);
                            setNombreUnidad(sat.nombre);
                            setCampoActivoSat(null);
                          }}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                        >
                          <div className="font-bold text-sm text-slate-800">{sat.clave}</div>
                          <div className="text-xs text-slate-500 truncate">{sat.nombre}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="!text-blue-800 font-bold text-sm">Objeto Impuesto *</label>
                  <select name="objetoImpuesto" defaultValue={editingProduct?.objetoImpuesto || "02"} className="w-full p-3 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="02">02 - Sí objeto de impuesto</option>
                    <option value="01">01 - No objeto de impuesto</option>
                    <option value="03">03 - Sí objeto no obligado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1"><label>Tasa IVA *</label><select name="ivaTasa" defaultValue={editingProduct?.ivaTasa || "0.16"} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"><option value="0.16">IVA 16%</option><option value="0.08">IVA 8% (Frontera)</option><option value="0.00">IVA 0%</option><option value="0.00">Exento</option></select></div>
                <div className="space-y-1"><label>Tasa IEPS (Opcional)</label><input name="iepsTasa" type="number" step="0.01" defaultValue={editingProduct?.iepsTasa || "0.00"} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="flex items-end gap-3">
                  <button type="button" onClick={cancelEdit} className="w-1/3 text-slate-600 font-bold py-3 rounded-xl border-2 border-slate-300 hover:bg-slate-100 text-base">Cancelar</button>
                  <button type="submit" className={`w-2/3 text-white font-bold py-3 rounded-xl transition-all shadow-lg text-base ${editingProduct ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>{editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}</button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Buscador de productos */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
          <Search className="w-6 h-6 text-slate-400" />
          <input type="text" placeholder="Buscar por SKU, Nombre o Clave SAT..." value={q} onChange={(e) => setQ(e.target.value)} className="w-full outline-none text-slate-700 bg-transparent text-base" />
        </div>

        {/* Tabla de Productos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] text-base">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-sm uppercase tracking-wider border-b border-slate-200"><th className="p-5 font-bold">Producto / Claves SAT</th><th className="p-5 font-bold text-right">Precio Base</th><th className="p-5 font-bold text-right">IVA</th><th className="p-5 font-bold text-right">Total</th><th className="p-5 text-center">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (<tr><td colSpan={5} className="p-10 text-center text-slate-400">Cargando catálogo...</td></tr>)
                  : productosFiltrados.length === 0 ? (<tr><td colSpan={5} className="p-10 text-center text-slate-400">No se encontraron productos.</td></tr>)
                    : (productosPaginados.map((p: any) => {
                      const precio = Number(p.precio) || 0; const iva = precio * Number(p.ivaTasa); const total = precio + iva;
                      return (
                        <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                          <td className="p-5"><div className="font-bold text-blue-900">{p.nombre}</div>
                            <div className="text-xs flex gap-2 mt-2 font-mono">
                              <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-600">SKU: {p.codigoInterno || 'N/A'}</span>
                              <span className="bg-blue-50 px-2 py-1 rounded-md border border-blue-100 text-blue-600">SAT: {p.claveProdServ}</span>
                            </div>
                          </td>
                          <td className="p-5 text-right font-mono text-slate-600">${precio.toFixed(2)}</td>
                          <td className="p-5 text-right font-mono text-orange-500">${iva.toFixed(2)}</td>
                          <td className="p-5 text-right font-mono font-bold text-green-600">${total.toFixed(2)}</td>
                          <td className="p-5 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleEdit(p)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors" title="Editar"><Edit2 className="w-5 h-5" /></button>
                              <button onClick={() => handleDelete(p.id, p.nombre)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Eliminar"><X className="w-5 h-5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    }))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 bg-slate-50 mt-auto">
              <span className="text-sm text-slate-500 font-medium">Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_POR_PAGINA, productosFiltrados.length)} de {productosFiltrados.length}</span>
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