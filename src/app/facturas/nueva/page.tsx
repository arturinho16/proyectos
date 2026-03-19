'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, PlusCircle, Trash2, Search } from 'lucide-react';
import { REGIMENES_FISCALES, USOS_CFDI } from '@/lib/sat/catalogos';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Client = {
  id: string;
  nombreRazonSocial: string;  // ✅ corregido (antes: nombre)
  rfc: string;
  regimenFiscal: string;
  cp: string;                 // ✅ corregido (antes: codigoPostal)
  usoCfdiDefault?: string;    // ✅ corregido (antes: usoCFDI)
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
  descuentoPct: number;       // ✅ nuevo: descuento como %
  ivaTasa: number;
  iepsTasa: number;
  objetoImpuesto: string;
};

// ─── Catálogos locales ────────────────────────────────────────────────────────
const FORMAS_PAGO = [
  { clave: '01', descripcion: 'Efectivo' },
  { clave: '02', descripcion: 'Cheque nominativo' },
  { clave: '03', descripcion: 'Transferencia electrónica de fondos' },
  { clave: '04', descripcion: 'Tarjeta de crédito' },
  { clave: '05', descripcion: 'Monedero electrónico' },
  { clave: '06', descripcion: 'Dinero electrónico' },
  { clave: '08', descripcion: 'Vales de despensa' },
  { clave: '12', descripcion: 'Dación en pago' },
  { clave: '13', descripcion: 'Pago por subrogación' },
  { clave: '14', descripcion: 'Pago por consignación' },
  { clave: '15', descripcion: 'Condonación' },
  { clave: '17', descripcion: 'Compensación' },
  { clave: '23', descripcion: 'Novación' },
  { clave: '24', descripcion: 'Confusión' },
  { clave: '25', descripcion: 'Remisión de deuda' },
  { clave: '26', descripcion: 'Prescripción o caducidad' },
  { clave: '27', descripcion: 'A satisfacción del acreedor' },
  { clave: '28', descripcion: 'Tarjeta de débito' },
  { clave: '29', descripcion: 'Tarjeta de servicios' },
  { clave: '30', descripcion: 'Aplicación de anticipos' },
  { clave: '31', descripcion: 'Intermediario pagos' },
  { clave: '99', descripcion: 'Por definir' },
];

const MONEDAS = [
  { clave: 'MXN', descripcion: 'Peso Mexicano' },
  { clave: 'USD', descripcion: 'Dólar Americano' },
  { clave: 'EUR', descripcion: 'Euro' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  productoId: '',
  descripcion: '',
  claveProdServ: '',
  claveUnidad: '',
  unidad: '',
  cantidad: 1,
  precioUnitario: 0,
  descuento: 0,
  descuentoPct: 0,
  ivaTasa: 0.16,
  iepsTasa: 0,
  objetoImpuesto: '02',
});

// ─── Componente: Buscador de cliente ─────────────────────────────────────────
function ClienteSearch({
  clients,
  onSelect,
}: {
  clients: Client[];
  onSelect: (c: Client) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.length >= 1
    ? clients.filter(c =>
      c.nombreRazonSocial.toLowerCase().includes(query.toLowerCase()) ||
      c.rfc.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (c: Client) => {
    setSelected(c);
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
          onChange={e => { setQuery(e.target.value); setOpen(true); setSelected(null); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por nombre o RFC..."
          className="w-full pl-9 p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0"
            >
              <div className="font-bold text-sm text-slate-800">{c.nombreRazonSocial}</div>
              <div className="text-xs text-slate-400 font-mono">{c.rfc} — CP {c.cp}</div>
            </button>
          ))}
        </div>
      )}
      {open && query.length >= 2 && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm text-slate-400">
          No se encontraron clientes
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function NuevaFacturaPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([conceptoVacio()]);
  const [submitting, setSubmitting] = useState(false);

  // Encabezado
  const [clienteId, setClienteId] = useState('');
  const [clienteData, setClienteData] = useState<Partial<Client>>({});
  const [usoCFDI, setUsoCFDI] = useState('G03');
  const [formaPago, setFormaPago] = useState('03');
  const [metodoPago, setMetodoPago] = useState('PUE');
  const [moneda, setMoneda] = useState('MXN');
  const [tipoCambio, setTipoCambio] = useState(1);
  const [serie, setSerie] = useState('A');
  const [folio, setFolio] = useState('1');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 16));
  const [condicionesPago, setCondicionesPago] = useState('');
  const [notas, setNotas] = useState('');

  // Retenciones
  const [retencionIVAPct, setRetencionIVAPct] = useState(0);
  const [retencionISRPct, setRetencionISRPct] = useState(0);

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []));
    fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []));
  }, []);

  // ✅ Regla SAT: PPD → forzar forma de pago 99
  useEffect(() => {
    if (metodoPago === 'PPD') setFormaPago('99');
  }, [metodoPago]);

  const handleClienteSelect = (c: Client) => {
    setClienteId(c.id);
    setClienteData(c);
    setUsoCFDI(c.usoCfdiDefault || 'G03');
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
    // Si cambia descuentoPct, limpiar descuento fijo y viceversa
    if (field === 'descuentoPct' && value > 0) updated[index].descuento = 0;
    if (field === 'descuento' && value > 0) updated[index].descuentoPct = 0;
    setConceptos(updated);
  };

  const agregarConcepto = () => setConceptos([...conceptos, conceptoVacio()]);
  const eliminarConcepto = (i: number) => setConceptos(conceptos.filter((_, idx) => idx !== i));

  // ─── Totales ───────────────────────────────────────────────────────────────
  const subtotal = conceptos.reduce((acc, c) => acc + calcularConcepto(c).importe, 0);
  const totalDescuentos = conceptos.reduce((acc, c) => acc + calcularConcepto(c).descuentoMonto, 0);
  const totalIVA = conceptos.reduce((acc, c) => acc + calcularConcepto(c).iva, 0);
  const totalIEPS = conceptos.reduce((acc, c) => acc + calcularConcepto(c).ieps, 0);
  const retencionIVA = subtotal * (retencionIVAPct / 100);
  const retencionISR = subtotal * (retencionISRPct / 100);
  const total = subtotal + totalIVA + totalIEPS - retencionIVA - retencionISR;

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!clienteId) return alert('Selecciona un cliente');
    if (conceptos.some(c => !c.productoId)) return alert('Todos los conceptos deben tener un producto');
    if (conceptos.some(c => !c.descripcion?.trim())) return alert('Todos los conceptos deben tener descripción');

    setSubmitting(true);
    const payload = {
      serie, folio, fecha, formaPago, metodoPago, moneda, tipoCambio,
      condicionesPago, notas, clienteId, usoCFDI,
      retencionIVAPct, retencionISRPct,
      conceptos: conceptos.map(c => ({
        ...c,
        descuento: calcularConcepto(c).descuentoMonto,
      })),
    };

    const res = await fetch('/api/facturas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);
    if (res.ok) {
      alert('✅ Factura guardada correctamente');
      // Limpiar formulario para nueva factura
      setClienteId('');
      setClienteData({});
      setUsoCFDI('G03');
      setFormaPago('03');
      setMetodoPago('PUE');
      setMoneda('MXN');
      setTipoCambio(1);
      setSerie('A');
      setFolio(prev => String(parseInt(prev) + 1)); // auto-incrementar folio
      setFecha(new Date().toISOString().slice(0, 16));
      setCondicionesPago('');
      setNotas('');
      setRetencionIVAPct(0);
      setRetencionISRPct(0);
      setConceptos([conceptoVacio()]);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`❌ Error: ${err?.error || 'No se pudo guardar'}`);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Nueva Factura</h1>
          <span className="ml-auto text-sm text-slate-400">CFDI 4.0 — Ingreso</span>
        </div>

        {/* BLOQUE 1: Encabezado */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold uppercase text-slate-400 mb-4">Encabezado</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Serie</label>
              <input value={serie} onChange={e => setSerie(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Folio</label>
              <input value={folio} onChange={e => setFolio(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500">Fecha y Hora</label>
              <input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Método de Pago</label>
              <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none">
                <option value="PUE">PUE - Una sola exhibición</option>
                <option value="PPD">PPD - Parcialidades o diferido</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">
                Forma de Pago
                {metodoPago === 'PPD' && <span className="ml-1 text-amber-500 font-normal normal-case">(forzado a 99)</span>}
              </label>
              <select
                value={formaPago}
                onChange={e => setFormaPago(e.target.value)}
                disabled={metodoPago === 'PPD'}
                className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {FORMAS_PAGO.map(f => <option key={f.clave} value={f.clave}>{f.clave} - {f.descripcion}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Moneda</label>
              <select value={moneda} onChange={e => setMoneda(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none">
                {MONEDAS.map(m => <option key={m.clave} value={m.clave}>{m.clave} - {m.descripcion}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">
                Tipo de Cambio
                {moneda === 'MXN' && <span className="ml-1 text-slate-400 font-normal normal-case">(N/A)</span>}
              </label>
              <input
                type="number" step="0.0001" min="0.0001"
                value={tipoCambio}
                onChange={e => setTipoCambio(parseFloat(e.target.value) || 1)}
                disabled={moneda === 'MXN'}
                className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Condiciones de Pago</label>
              <input value={condicionesPago} onChange={e => setCondicionesPago(e.target.value)} placeholder="Ej: CONTADO" className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1 col-span-2 md:col-span-3">
              <label className="text-xs font-bold uppercase text-slate-500">Notas Internas</label>
              <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional — no aparece en el CFDI" className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: Receptor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold uppercase text-slate-400 mb-4">Receptor</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Buscar Cliente</label>
              <ClienteSearch clients={clients} onSelect={handleClienteSelect} />
            </div>

            {clienteData.rfc && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-blue-600">RFC</label>
                  <div className="p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-mono">{clienteData.rfc}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-blue-600">Código Postal</label>
                  <div className="p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-mono">{clienteData.cp}</div>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold uppercase text-blue-600">Régimen Fiscal</label>
                  <div className="p-2.5 bg-white border border-blue-200 rounded-xl text-sm">
                    {clienteData.regimenFiscal} — {REGIMENES_FISCALES.find(r => r.clave === clienteData.regimenFiscal)?.descripcion}
                  </div>
                </div>
                <div className="space-y-1 col-span-2 md:col-span-4">
                  <label className="text-xs font-bold uppercase text-blue-600">Uso CFDI</label>
                  <select value={usoCFDI} onChange={e => setUsoCFDI(e.target.value)} className="w-full p-2.5 border border-blue-200 rounded-xl bg-white outline-none">
                    {USOS_CFDI.map(u => <option key={u.clave} value={u.clave}>{u.descripcion}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BLOQUE 3: Conceptos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase text-slate-400">Conceptos</h2>
            <button onClick={agregarConcepto} className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all">
              <PlusCircle className="w-4 h-4" /> Agregar Concepto
            </button>
          </div>

          <div className="space-y-4">
            {conceptos.map((c, i) => {
              const { importe, iva, ieps } = calcularConcepto(c);
              return (
                <div key={i} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-3">
                  {/* Fila 1: Producto + Cantidad + Precio */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold uppercase text-slate-500">Producto / Servicio</label>
                      <select
                        value={c.productoId}
                        onChange={e => handleProductoChange(i, e.target.value)}
                        className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Selecciona un producto —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Cantidad</label>
                      <input
                        type="number" min="0.001" step="0.001"
                        value={c.cantidad}
                        onChange={e => handleConceptoField(i, 'cantidad', parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Precio Unitario</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                        <input
                          type="number" step="0.000001"
                          value={c.precioUnitario}
                          onChange={e => handleConceptoField(i, 'precioUnitario', parseFloat(e.target.value) || 0)}
                          className="w-full p-2.5 pl-6 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Descripción editable */}
                  {c.productoId && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Descripción <span className="text-slate-400 font-normal normal-case">(editable — aparece en el CFDI)</span></label>
                      <input
                        value={c.descripcion}
                        onChange={e => handleConceptoField(i, 'descripcion', e.target.value)}
                        className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  )}

                  {/* Fila 3: Claves SAT + Descuento + Totales */}
                  {c.productoId && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 border-t border-slate-200">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">Clave SAT</label>
                        <div className="text-xs font-mono bg-slate-100 p-2 rounded-lg">{c.claveProdServ}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">Unidad</label>
                        <div className="text-xs font-mono bg-slate-100 p-2 rounded-lg">{c.claveUnidad} - {c.unidad}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">Desc. $</label>
                        <input
                          type="number" step="0.01" min="0"
                          value={c.descuento}
                          onChange={e => handleConceptoField(i, 'descuento', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 border rounded-lg bg-white outline-none text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">Desc. %</label>
                        <input
                          type="number" step="0.01" min="0" max="100"
                          value={c.descuentoPct}
                          onChange={e => handleConceptoField(i, 'descuentoPct', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 border rounded-lg bg-white outline-none text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">IVA</label>
                        <div className="text-xs font-mono bg-orange-50 text-orange-600 p-2 rounded-lg">${iva.toFixed(2)}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">Importe</label>
                        <div className="text-xs font-mono bg-green-50 text-green-700 font-bold p-2 rounded-lg">${importe.toFixed(2)}</div>
                      </div>
                    </div>
                  )}

                  {conceptos.length > 1 && (
                    <div className="flex justify-end">
                      <button onClick={() => eliminarConcepto(i)} className="text-red-400 hover:text-red-600 flex items-center gap-1 text-xs">
                        <Trash2 className="w-3 h-3" /> Eliminar concepto
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BLOQUE 4: Retenciones + Totales */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold uppercase text-slate-400 mb-4">Retenciones e Impuestos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500">Retención IVA %</label>
                  <input type="number" step="0.01" min="0" max="100" value={retencionIVAPct}
                    onChange={e => setRetencionIVAPct(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500">Retención ISR %</label>
                  <input type="number" step="0.01" min="0" max="100" value={retencionISRPct}
                    onChange={e => setRetencionISRPct(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400">Ej: Honorarios → IVA 10.67%, ISR 10%</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200">
              {totalDescuentos > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Descuentos</span>
                  <span className="font-mono text-red-400">-${totalDescuentos.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              {totalIEPS > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>IEPS</span>
                  <span className="font-mono text-orange-500">${totalIEPS.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-600">
                <span>IVA Trasladado</span>
                <span className="font-mono text-orange-500">${totalIVA.toFixed(2)}</span>
              </div>
              {retencionIVA > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>(-) Retención IVA</span>
                  <span className="font-mono">-${retencionIVA.toFixed(2)}</span>
                </div>
              )}
              {retencionISR > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>(-) Retención ISR</span>
                  <span className="font-mono">-${retencionISR.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-blue-900 border-t pt-2 mt-2">
                <span>Total {moneda !== 'MXN' ? moneda : ''}</span>
                <span className="font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pb-10">
          <button onClick={() => window.history.back()} className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : '💾 Guardar Factura'}
          </button>
        </div>

      </div>
    </div>
  );
}