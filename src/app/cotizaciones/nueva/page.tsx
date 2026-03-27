'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileCheck2, PlusCircle, Trash2, Search, X, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Client = {
  id: string;
  nombreRazonSocial: string;
  rfc: string;
  cp: string;
};

type Product = {
  id: string;
  nombre: string;
  descripcion: string;
  claveProdServ: string;
  claveUnidad: string;
  unidad: string;
  precio: number;
  ivaTasa: number;
  iepsTasa: number;
  objetoImpuesto: string;
};

type Concepto = {
  productoId: string;
  descripcion: string;
  claveProdServ: string;
  claveUnidad: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  descuentoPct: number;
  ivaTasa: number;
  iepsTasa: number;
  objetoImpuesto: string;
};

// ─── Catálogos locales ────────────────────────────────────────────────────────
const MONEDAS = [
  { clave: 'MXN', descripcion: 'Peso Mexicano' },
  { clave: 'USD', descripcion: 'Dólar Americano' },
  { clave: 'EUR', descripcion: 'Euro' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const calcularConcepto = (c: Concepto) => {
  const importeBruto = c.cantidad * c.precioUnitario;
  const descuentoMonto = c.descuentoPct > 0
    ? importeBruto * (c.descuentoPct / 100)
    : c.descuento;
  const importe = importeBruto - descuentoMonto;
  const iva = c.objetoImpuesto !== '01' ? importe * c.ivaTasa : 0;
  const ieps = c.objetoImpuesto !== '01' ? importe * c.iepsTasa : 0;
  return { importe, iva, ieps, descuentoMonto };
};

const conceptoVacio = (): Concepto => ({
  productoId: '', descripcion: '', claveProdServ: '', claveUnidad: '', unidad: '',
  cantidad: 1, precioUnitario: 0, descuento: 0, descuentoPct: 0, ivaTasa: 0.16, iepsTasa: 0, objetoImpuesto: '02',
});

// ─── Componente: Buscador de cliente ─────────────────────────────────────────
function ClienteSearch({ clients, onSelect }: { clients: Client[]; onSelect: (c: Client) => void; }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.length >= 1
    ? clients.filter(c =>
      c.nombreRazonSocial.toLowerCase().includes(query.toLowerCase()) ||
      c.rfc.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (c: Client) => {
    setQuery(c.nombreRazonSocial);
    setOpen(false);
    onSelect(c);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente..."
          className="w-full pl-9 p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {filtered.map(c => (
            <button key={c.id} type="button" onClick={() => handleSelect(c)} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100">
              <div className="font-bold text-sm text-slate-800">{c.nombreRazonSocial}</div>
              <div className="text-xs text-slate-400 font-mono">{c.rfc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function NuevaCotizacionPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([conceptoVacio()]);
  const [submitting, setSubmitting] = useState(false);
  const [cotizacionExitosa, setCotizacionExitosa] = useState<{ serie: string, folio: string } | null>(null);

  // Encabezado
  const [clienteId, setClienteId] = useState('');
  const [clienteData, setClienteData] = useState<Partial<Client>>({});
  const [moneda, setMoneda] = useState('MXN');
  const [tipoCambio, setTipoCambio] = useState(1);
  const [serie, setSerie] = useState('COT');
  const [folio, setFolio] = useState('100');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 16));
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [condicionesPago, setCondicionesPago] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []));
    fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []));
  }, []);

  const handleClienteSelect = (c: Client) => {
    setClienteId(c.id);
    setClienteData(c);
  };

  const handleProductoChange = (index: number, productoId: string) => {
    const p = products.find(p => p.id === productoId);
    if (!p) return;
    const updated = [...conceptos];
    updated[index] = {
      ...updated[index],
      productoId: p.id,
      descripcion: p.descripcion || p.nombre,
      claveProdServ: p.claveProdServ,
      claveUnidad: p.claveUnidad,
      unidad: p.unidad,
      precioUnitario: Number(p.precio),
      ivaTasa: Number(p.ivaTasa),
      iepsTasa: Number(p.iepsTasa) || 0,
      objetoImpuesto: p.objetoImpuesto || '02',
    };
    setConceptos(updated);
  };

  const handleConceptoField = (index: number, field: keyof Concepto, value: any) => {
    const updated = [...conceptos];
    (updated[index] as any)[field] = value;
    if (field === 'descuentoPct' && value > 0) updated[index].descuento = 0;
    if (field === 'descuento' && value > 0) updated[index].descuentoPct = 0;
    setConceptos(updated);
  };

  const agregarConcepto = () => setConceptos([...conceptos, conceptoVacio()]);
  const eliminarConcepto = (i: number) => setConceptos(conceptos.filter((_, idx) => idx !== i));

  const subtotal = conceptos.reduce((acc, c) => acc + calcularConcepto(c).importe, 0);
  const totalDescuentos = conceptos.reduce((acc, c) => acc + calcularConcepto(c).descuentoMonto, 0);
  const totalIVA = conceptos.reduce((acc, c) => acc + calcularConcepto(c).iva, 0);
  const total = subtotal + totalIVA;

  const handleSubmit = async () => {
    if (!clienteId) return alert('Selecciona un cliente');
    if (conceptos.some(c => !c.productoId)) return alert('Todos los conceptos deben tener un producto');
    if (conceptos.some(c => !c.descripcion?.trim())) return alert('Todos los conceptos deben tener descripción');

    setSubmitting(true);
    const payload = {
      serie, folio, fecha, fechaVencimiento, moneda, tipoCambio,
      condicionesPago, notas, clienteId,
      conceptos: conceptos.map(c => ({
        ...c,
        descuento: calcularConcepto(c).descuentoMonto,
      })),
    };

    const res = await fetch('/api/cotizaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (res.ok) {
      setCotizacionExitosa({ serie, folio });
      // Limpiamos el form y sumamos 1 al folio para evitar el error de Unique Constraint
      setClienteId(''); setClienteData({}); setConceptos([conceptoVacio()]); setFolio(String(parseInt(folio) + 1)); setNotas('');
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`❌ Error: ${err?.error || 'No se pudo guardar la cotización'}`);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">

      {/* Modal de Éxito Simplificado */}
      {cotizacionExitosa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Presupuesto Creado!</h2>
              <p className="text-slate-500 text-sm">
                La cotización <span className="font-bold text-slate-700">{cotizacionExitosa.serie}-{cotizacionExitosa.folio}</span> se guardó correctamente.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Link href="/cotizaciones" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">
                Ir a Cotizaciones
              </Link>
              <button onClick={() => setCotizacionExitosa(null)} className="w-full py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">
                Crear otra cotización
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <Link href="/cotizaciones" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Cotizaciones
          </Link>
          <FileCheck2 className="w-7 h-7 text-blue-600 ml-1" />
          <h1 className="text-2xl sm:text-3xl font-bold">Nueva Cotización</h1>
          <span className="ml-auto text-xs sm:text-sm text-slate-400">Documento sin validez fiscal</span>
        </div>

        {/* BLOQUE 1: Encabezado */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold uppercase text-slate-400 mb-4">Detalles Comerciales</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Serie</label>
              <input value={serie} onChange={e => setSerie(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Folio</label>
              <input value={folio} onChange={e => setFolio(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500">Fecha de Emisión</label>
              <input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500">Válida hasta (Opcional)</label>
              <input type="datetime-local" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Moneda</label>
              <select value={moneda} onChange={e => setMoneda(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none">
                {MONEDAS.map(m => <option key={m.clave} value={m.clave}>{m.clave} - {m.descripcion}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">
                Tipo de Cambio {moneda === 'MXN' && <span className="font-normal normal-case text-slate-400">(N/A)</span>}
              </label>
              <input type="number" step="0.0001" value={tipoCambio} onChange={e => setTipoCambio(parseFloat(e.target.value) || 1)} disabled={moneda === 'MXN'} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none disabled:opacity-50" />
            </div>
            <div className="space-y-1 col-span-2 md:col-span-4">
              <label className="text-xs font-bold uppercase text-slate-500">Notas para el cliente</label>
              <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej: Tiempo de entrega 5 días hábiles..." className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: Cliente (Más sencillo que en la factura) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold uppercase text-slate-400 mb-4">Cliente / Prospecto</h2>
          <div className="space-y-4">
            <ClienteSearch clients={clients} onSelect={handleClienteSelect} />
            {clienteData.rfc && (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex gap-6">
                <div>
                  <div className="text-xs font-bold uppercase text-blue-600 mb-1">Nombre Comercial</div>
                  <div className="font-bold text-slate-800">{clienteData.nombreRazonSocial}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-blue-600 mb-1">RFC</div>
                  <div className="font-mono text-slate-600 text-sm">{clienteData.rfc}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BLOQUE 3: Conceptos (Reutiliza tu lógica exacta) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase text-slate-400">Conceptos a Cotizar</h2>
            <button onClick={agregarConcepto} className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all">
              <PlusCircle className="w-4 h-4" /> Agregar Producto
            </button>
          </div>

          <div className="space-y-4">
            {conceptos.map((c, i) => {
              const { importe, iva } = calcularConcepto(c);
              return (
                <div key={i} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold uppercase text-slate-500">Producto / Servicio</label>
                      <select value={c.productoId} onChange={e => handleProductoChange(i, e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">— Selecciona un producto —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>

                    {/* INPUT DE CANTIDAD CORREGIDO PARA NÚMEROS ENTEROS */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={c.cantidad}
                        onChange={e => handleConceptoField(i, 'cantidad', parseInt(e.target.value, 10) || 1)}
                        className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Precio Unitario</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                        <input type="number" step="0.000001" value={c.precioUnitario} onChange={e => handleConceptoField(i, 'precioUnitario', parseFloat(e.target.value) || 0)} className="w-full p-2.5 pl-6 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>

                  {c.productoId && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Descripción Ajustable</label>
                      <input value={c.descripcion} onChange={e => handleConceptoField(i, 'descripcion', e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                  )}

                  {c.productoId && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-200">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">Desc. $</label>
                        <input type="number" step="0.01" min="0" value={c.descuento} onChange={e => handleConceptoField(i, 'descuento', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-lg bg-white outline-none text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">Desc. %</label>
                        <input type="number" step="0.01" min="0" max="100" value={c.descuentoPct} onChange={e => handleConceptoField(i, 'descuentoPct', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded-lg bg-white outline-none text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">IVA</label>
                        <div className="text-xs font-mono bg-orange-50 text-orange-600 p-2 rounded-lg">${iva.toFixed(2)}</div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold uppercase text-slate-400">Importe</label>
                        <div className="text-xs font-mono bg-green-50 text-green-700 font-bold p-2 rounded-lg">${importe.toFixed(2)}</div>
                      </div>
                    </div>
                  )}

                  {conceptos.length > 1 && (
                    <div className="flex justify-end">
                      <button onClick={() => eliminarConcepto(i)} className="text-red-400 hover:text-red-600 flex items-center gap-1 text-xs"><Trash2 className="w-3 h-3" /> Eliminar concepto</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BLOQUE 4: Totales */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-end">
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 w-full md:w-1/3 space-y-2">
            <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span className="font-mono">${subtotal.toFixed(2)}</span></div>
            {totalDescuentos > 0 && <div className="flex justify-between text-sm text-red-500"><span>Descuentos</span><span className="font-mono">-${totalDescuentos.toFixed(2)}</span></div>}
            <div className="flex justify-between text-sm text-slate-600"><span>IVA</span><span className="font-mono text-orange-500">${totalIVA.toFixed(2)}</span></div>
            <div className="flex justify-between text-xl font-bold text-blue-900 border-t pt-3 mt-2">
              <span>Total</span><span className="font-mono">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Botones Flotantes */}
        <div className="flex justify-end gap-3 pb-10">
          <button onClick={() => window.history.back()} className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition-all font-bold">Cancelar</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50">
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Guardando...</> : '💾 Guardar Cotización'}
          </button>
        </div>
      </div>
    </div>
  );
}