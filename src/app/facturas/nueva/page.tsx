'use client';

import { useState, useEffect } from 'react';
import { FileText, PlusCircle, Trash2, ChevronDown } from 'lucide-react';

// --- TIPOS ---
type Client = {
  id: string;
  nombre: string;
  rfc: string;
  regimenFiscal: string;
  codigoPostal: string;
  usoCFDI: string;
};

type Product = {
  id: string;
  nombre: string;
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
  ivaTasa: number;
  iepsTasa: number;
  objetoImpuesto: string;
};

// --- CATÁLOGOS SAT ---
const USOS_CFDI = [
  { clave: 'G01', descripcion: 'Adquisición de mercancias' },
  { clave: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones' },
  { clave: 'G03', descripcion: 'Gastos en general' },
  { clave: 'I01', descripcion: 'Construcciones' },
  { clave: 'I02', descripcion: 'Mobilario y equipo de oficina por inversiones' },
  { clave: 'I03', descripcion: 'Equipo de transporte' },
  { clave: 'I04', descripcion: 'Equipo de computo y accesorios' },
  { clave: 'I06', descripcion: 'Comunicaciones telefónicas' },
  { clave: 'I08', descripcion: 'Otra maquinaria y equipo' },
  { clave: 'D01', descripcion: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { clave: 'D02', descripcion: 'Gastos médicos por incapacidad o discapacidad' },
  { clave: 'D03', descripcion: 'Gastos funerales' },
  { clave: 'D04', descripcion: 'Donativos' },
  { clave: 'D05', descripcion: 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
  { clave: 'D06', descripcion: 'Aportaciones voluntarias al SAR' },
  { clave: 'D07', descripcion: 'Primas por seguros de gastos médicos' },
  { clave: 'D08', descripcion: 'Gastos de transportación escolar obligatoria' },
  { clave: 'D09', descripcion: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
  { clave: 'D10', descripcion: 'Pagos por servicios educativos (colegiaturas)' },
  { clave: 'S01', descripcion: 'Sin efectos fiscales' },
  { clave: 'CP01', descripcion: 'Pagos' },
  { clave: 'CN01', descripcion: 'Nómina' },
];

const REGIMENES_FISCALES = [
  { clave: '601', descripcion: 'General de Ley Personas Morales' },
  { clave: '603', descripcion: 'Personas Morales con Fines no Lucrativos' },
  { clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { clave: '606', descripcion: 'Arrendamiento' },
  { clave: '607', descripcion: 'Régimen de Enajenación o Adquisición de Bienes' },
  { clave: '608', descripcion: 'Demás ingresos' },
  { clave: '610', descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
  { clave: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)' },
  { clave: '612', descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { clave: '614', descripcion: 'Ingresos por intereses' },
  { clave: '615', descripcion: 'Régimen de los ingresos por obtención de premios' },
  { clave: '616', descripcion: 'Sin obligaciones fiscales' },
  { clave: '620', descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
  { clave: '621', descripcion: 'Incorporación Fiscal' },
  { clave: '622', descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { clave: '623', descripcion: 'Opcional para Grupos de Sociedades' },
  { clave: '624', descripcion: 'Coordinados' },
  { clave: '625', descripcion: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { clave: '626', descripcion: 'Régimen Simplificado de Confianza' },
];

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

// --- HELPERS ---
const calcularConcepto = (c: Concepto) => {
  const importe = c.cantidad * c.precioUnitario - c.descuento;
  const iva = c.objetoImpuesto !== '01' ? importe * c.ivaTasa : 0;
  const ieps = c.objetoImpuesto !== '01' ? importe * c.iepsTasa : 0;
  return { importe, iva, ieps };
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
  ivaTasa: 0.16,
  iepsTasa: 0,
  objetoImpuesto: '02',
});

export default function NuevaFacturaPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([conceptoVacio()]);
  const [submitting, setSubmitting] = useState(false);

  // Datos del encabezado
  const [clienteId, setClienteId] = useState('');
  const [clienteData, setClienteData] = useState<Partial<Client>>({});
  const [usoCFDI, setUsoCFDI] = useState('G03');
  const [formaPago, setFormaPago] = useState('03');
  const [metodoPago, setMetodoPago] = useState('PUE');
  const [serie, setSerie] = useState('A');
  const [folio, setFolio] = useState('1');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 16));
  const [condicionesPago, setCondicionesPago] = useState('');
  const [notas, setNotas] = useState('');

  // Retenciones globales
  const [retencionIVAPct, setRetencionIVAPct] = useState(0);
  const [retencionISRPct, setRetencionISRPct] = useState(0);

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []));
    fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []));
  }, []);

  // Al seleccionar cliente → llenar datos automáticamente
  const handleClienteChange = (id: string) => {
    setClienteId(id);
    const c = clients.find(c => c.id === id);
    if (c) {
      setClienteData(c);
      setUsoCFDI(c.usoCFDI || 'G03');
    }
  };

  // Al seleccionar producto en un concepto → llenar datos
  const handleProductoChange = (index: number, productoId: string) => {
    const p = products.find(p => p.id === productoId);
    if (!p) return;
    const updated = [...conceptos];
    updated[index] = {
      ...updated[index],
      productoId: p.id,
      descripcion: p.nombre,
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
    setConceptos(updated);
  };

  const agregarConcepto = () => setConceptos([...conceptos, conceptoVacio()]);
  const eliminarConcepto = (i: number) => setConceptos(conceptos.filter((_, idx) => idx !== i));

  // --- CÁLCULOS TOTALES ---
  const subtotal = conceptos.reduce((acc, c) => acc + calcularConcepto(c).importe, 0);
  const totalIVA = conceptos.reduce((acc, c) => acc + calcularConcepto(c).iva, 0);
  const totalIEPS = conceptos.reduce((acc, c) => acc + calcularConcepto(c).ieps, 0);
  const retencionIVA = subtotal * (retencionIVAPct / 100);
  const retencionISR = subtotal * (retencionISRPct / 100);
  const total = subtotal + totalIVA + totalIEPS - retencionIVA - retencionISR;

  const handleSubmit = async () => {
    if (!clienteId) return alert('Selecciona un cliente');
    if (conceptos.some(c => !c.productoId)) return alert('Todos los conceptos deben tener un producto');

    setSubmitting(true);
    const payload = {
      serie, folio, fecha, formaPago, metodoPago, condicionesPago, notas,
      clienteId, usoCFDI,
      regimenFiscalReceptor: clienteData.regimenFiscal,
      domicilioFiscalReceptor: clienteData.codigoPostal,
      conceptos,
      retencionIVAPct, retencionISRPct,
      subtotal, totalIVA, totalIEPS, retencionIVA, retencionISR, total,
    };

    const res = await fetch('/api/facturas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);
    if (res.ok) {
      alert('✅ Factura guardada (pendiente de timbrar)');
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`❌ Error: ${err?.error || 'No se pudo guardar'}`);
    }
  };

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
              <label className="text-xs font-bold uppercase text-slate-500">Forma de Pago</label>
              <select value={formaPago} onChange={e => setFormaPago(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none">
                {FORMAS_PAGO.map(f => <option key={f.clave} value={f.clave}>{f.clave} - {f.descripcion}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Método de Pago</label>
              <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none">
                <option value="PUE">PUE - Pago en una sola exhibición</option>
                <option value="PPD">PPD - Pago en parcialidades o diferido</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Condiciones de Pago</label>
              <input value={condicionesPago} onChange={e => setCondicionesPago(e.target.value)} placeholder="Ej: CONTADO" className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Notas Internas</label>
              <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: Receptor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold uppercase text-slate-400 mb-4">Receptor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500">Buscar Cliente por Nombre</label>
              <select
                value={clienteId}
                onChange={e => handleClienteChange(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Selecciona un cliente —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} — {c.rfc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Datos auto-llenados */}
          {clienteData.rfc && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-blue-600">RFC</label>
                <div className="p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-mono">{clienteData.rfc}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-blue-600">Código Postal</label>
                <div className="p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-mono">{clienteData.codigoPostal}</div>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold uppercase text-blue-600">Régimen Fiscal</label>
                <div className="p-2.5 bg-white border border-blue-200 rounded-xl text-sm">{clienteData.regimenFiscal} — {REGIMENES_FISCALES.find(r => r.clave === clienteData.regimenFiscal)?.descripcion}</div>
              </div>
              <div className="space-y-1 col-span-2 md:col-span-4">
                <label className="text-xs font-bold uppercase text-blue-600">Uso CFDI</label>
                <select value={usoCFDI} onChange={e => setUsoCFDI(e.target.value)} className="w-full p-2.5 border border-blue-200 rounded-xl bg-white outline-none">
                  {USOS_CFDI.map(u => <option key={u.clave} value={u.clave}>{u.clave} - {u.descripcion}</option>)}
                </select>
              </div>
            </div>
          )}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Producto */}
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
                    {/* Cantidad */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Cantidad</label>
                      <input
                        type="number" min="0.001" step="0.001"
                        value={c.cantidad}
                        onChange={e => handleConceptoField(i, 'cantidad', parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {/* Precio */}
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

                  {/* Fila 2: Claves SAT + Descuento + Totales */}
                  {c.productoId && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-200">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">Clave SAT</label>
                        <div className="text-xs font-mono bg-slate-100 p-2 rounded-lg">{c.claveProdServ}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">Unidad</label>
                        <div className="text-xs font-mono bg-slate-100 p-2 rounded-lg">{c.claveUnidad} - {c.unidad}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">Descuento $</label>
                        <input
                          type="number" step="0.01" min="0"
                          value={c.descuento}
                          onChange={e => handleConceptoField(i, 'descuento', parseFloat(e.target.value) || 0)}
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

                  {/* Botón eliminar */}
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
            {/* Retenciones */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500">Retención IVA %</label>
                  <input
                    type="number" step="0.01" min="0" max="100"
                    value={retencionIVAPct}
                    onChange={e => setRetencionIVAPct(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500">Retención ISR %</label>
                  <input
                    type="number" step="0.01" min="0" max="100"
                    value={retencionISRPct}
                    onChange={e => setRetencionISRPct(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">Las retenciones se calculan sobre el subtotal. Ej: IVA 10.67%, ISR 10%</p>
            </div>

            {/* Totales */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200">
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
                <span>Total</span>
                <span className="font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Final */}
        <div className="flex justify-end gap-3 pb-10">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
          >
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
