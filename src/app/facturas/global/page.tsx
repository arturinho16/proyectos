'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Globe, ArrowLeft, Save, Plus, Trash2, Calculator, Info, Loader2, CheckCircle2, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const PERIODICIDADES = [
  { c: '01', d: '01 - Diaria' },
  { c: '02', d: '02 - Semanal' },
  { c: '03', d: '03 - Quincenal' },
  { c: '04', d: '04 - Mensual' }
];

const MESES = [
  { c: '01', d: 'Enero' }, { c: '02', d: 'Febrero' }, { c: '03', d: 'Marzo' },
  { c: '04', d: 'Abril' }, { c: '05', d: 'Mayo' }, { c: '06', d: 'Junio' },
  { c: '07', d: 'Julio' }, { c: '08', d: 'Agosto' }, { c: '09', d: 'Septiembre' },
  { c: '10', d: 'Octubre' }, { c: '11', d: 'Noviembre' }, { c: '12', d: 'Diciembre' }
];

const ANIOS = [2024, 2025, 2026, 2027];

type Product = { id: string; codigoInterno: string | null; nombre: string; precio: number; ivaTasa: number; };
// Añadimos precioUnitarioConIva para recordar el costo original al multiplicar
type Ticket = { id: number; folio: string; descripcion: string; cantidad: number; total: number; productoId?: string; showSuggestions: boolean; precioUnitarioConIva?: number; };

export default function FacturaGlobalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [productosBD, setProductosBD] = useState<Product[]>([]);
  const [periodicidad, setPeriodicidad] = useState('04');
  const [mesSat, setMesSat] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [anioSat, setAnioSat] = useState(new Date().getFullYear());
  const [tickets, setTickets] = useState<Ticket[]>([{ id: Date.now(), folio: '', descripcion: '', cantidad: 1, total: 0, showSuggestions: false }]);

  useEffect(() => {
    fetch('/api/products').then(res => res.json()).then(data => { if (Array.isArray(data)) setProductosBD(data); });
  }, []);

  const resumen = useMemo(() => {
    const totalGlobal = tickets.reduce((acc, t) => acc + Number(t.total || 0), 0);
    const subtotal = totalGlobal / 1.16;
    const iva = totalGlobal - subtotal;
    return { subtotal, iva, total: totalGlobal };
  }, [tickets]);

  const addTicket = () => setTickets([...tickets, { id: Date.now(), folio: '', descripcion: '', cantidad: 1, total: 0, showSuggestions: false }]);
  const removeTicket = (id: number) => setTickets(tickets.filter(t => t.id !== id));

  const updateTicket = (id: number, field: string, value: any) => {
    setTickets(tickets.map(t => {
      if (t.id === id) {
        const updated = { ...t, [field]: value };
        if (field === 'descripcion') updated.showSuggestions = true;

        // ── MAGIA: SUMATORIA AUTOMÁTICA DE CANTIDAD ──
        if (field === 'cantidad' && updated.precioUnitarioConIva) {
          updated.total = Number(value) * updated.precioUnitarioConIva;
        }

        return updated;
      }
      return t;
    }));
  };

  const selectProduct = (ticketId: number, prod: Product) => {
    const precioBase = Number(prod.precio);
    const iva = precioBase * Number(prod.ivaTasa);
    const precioUnitarioConIva = precioBase + iva;

    setTickets(tickets.map(t => t.id === ticketId ? {
      ...t,
      descripcion: prod.nombre,
      productoId: prod.id,
      cantidad: 1,
      precioUnitarioConIva: precioUnitarioConIva, // Guardamos el valor base
      total: precioUnitarioConIva,
      showSuggestions: false
    } : t));
  };

  const handleTimbrar = async () => {
    if (tickets.some(t => !t.descripcion || t.total <= 0 || t.cantidad <= 0)) {
      alert("Todos los tickets deben tener Descripción, Cantidad mayor a 0 y un Monto válido."); return;
    }

    setLoading(true);
    try {
      const hoy = new Date();
      const dia = hoy.getDate().toString().padStart(2, '0');
      const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
      const anio = hoy.getFullYear().toString();
      const consecutivo = `${hoy.getHours().toString().padStart(2, '0')}${hoy.getMinutes().toString().padStart(2, '0')}`;
      const folioUnico = `${dia}${mes}${anio}-${consecutivo}`;

      const payload = {
        serie: 'FG', folio: folioUnico, fecha: hoy.toISOString(), lugarExpedicion: '42000',
        moneda: 'MXN', tipoCambio: 1, formaPago: '01', metodoPago: 'PUE',
        tipoComprobante: 'I', usoCFDI: 'S01',
        receptorManual: { rfc: 'XAXX010101000', nombre: 'PUBLICO EN GENERAL', cp: '42000', regimenFiscal: '616' },
        esGlobal: true, periodicidad, mes: mesSat, anio: anioSat,
        conceptos: tickets.map((t, index) => {
          const folioSeguro = t.folio.trim() || `TICKET-${Date.now().toString().slice(-4)}-${index}`;
          const importeLinea = Number(t.total) / 1.16;
          const precioUnitarioReal = importeLinea / Number(t.cantidad);

          return {
            productId: t.productoId || null, noIdentificacion: folioSeguro,
            claveProdServ: '01010101', claveUnidad: 'ACT', unidad: 'Actividad',
            descripcion: `Venta - ${t.descripcion}`, cantidad: Number(t.cantidad),
            precioUnitario: precioUnitarioReal, importe: importeLinea, descuento: 0,
            objetoImpuesto: '02', ivaTasa: 0.16, iepsTasa: 0,
            ivaImporte: importeLinea * 0.16, iepsImporte: 0
          };
        })
      };

      const res = await fetch('/api/facturas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setSuccess(true); setTimeout(() => router.push('/facturas'), 2000); }
      else { const err = await res.json(); alert("Error al guardar: " + (err.error || 'Desconocido')); }
    } catch (error) { alert("Error de conexión con el servidor."); } finally { setLoading(false); }
  };

  if (success) return (<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-center space-y-4"><CheckCircle2 className="w-20 h-20 text-green-500 mx-auto animate-bounce" /><h1 className="text-3xl font-bold text-slate-800">¡Factura Guardada!</h1></div></div>);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/facturas" className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ArrowLeft /></Link><div className="bg-indigo-600 p-2 rounded-xl"><Globe className="text-white w-6 h-6" /></div><h1 className="text-3xl font-bold">Nueva Factura Global</h1></div>
          <div className="bg-white px-6 py-3 rounded-2xl border-2 border-indigo-100 shadow-sm text-right"><span className="text-xs font-bold text-slate-400 uppercase block">Total de la Global</span><span className="text-2xl font-black text-indigo-600">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(resumen.total)}</span></div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-2 border-slate-300 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1"><label className="text-sm font-black text-slate-500 uppercase">Periodicidad</label><select value={periodicidad} onChange={e => setPeriodicidad(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold">{PERIODICIDADES.map(p => <option key={p.c} value={p.c}>{p.d}</option>)}</select></div>
          <div className="space-y-1"><label className="text-sm font-black text-slate-500 uppercase">Mes correspondiente</label><select value={mesSat} onChange={e => setMesSat(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold">{MESES.map(m => <option key={m.c} value={m.c}>{m.d}</option>)}</select></div>
          <div className="space-y-1"><label className="text-sm font-black text-slate-500 uppercase">Año</label><select value={anioSat} onChange={e => setAnioSat(Number(e.target.value))} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold">{ANIOS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-visible">
          <div className="p-4 bg-slate-50 border-b-2 border-slate-200 flex justify-between items-center"><h2 className="font-bold flex items-center gap-2 text-slate-600 uppercase text-sm"><Calculator className="w-4 h-4" /> Registro de Ventas (Tickets)</h2><button onClick={addTicket} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"><Plus className="w-4 h-4" /> Agregar Fila</button></div>
          <table className="w-full text-base border-collapse">
            <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase">
              <tr><th className="px-4 py-4 text-left w-48">Folio (Opcional)</th><th className="px-4 py-4 text-left">Descripción / Producto</th><th className="px-4 py-4 text-center w-24">Cant.</th><th className="px-4 py-4 text-right w-40">Total Línea ($)</th><th className="px-4 py-4 text-center w-12"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((t) => {
                const sugerencias = t.showSuggestions && t.descripcion.length > 1 ? productosBD.filter(p => p.nombre.toLowerCase().includes(t.descripcion.toLowerCase()) || (p.codigoInterno && p.codigoInterno.toLowerCase().includes(t.descripcion.toLowerCase()))).slice(0, 5) : [];
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 align-top"><input placeholder="T-1001" value={t.folio} onChange={e => updateTicket(t.id, 'folio', e.target.value)} className="w-full p-2 border-2 border-transparent focus:border-indigo-300 rounded-lg outline-none font-mono font-bold text-slate-600 placeholder:font-normal" /></td>
                    <td className="px-4 py-3 relative align-top">
                      <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input placeholder="Buscar producto o describir venta..." value={t.descripcion} onChange={e => updateTicket(t.id, 'descripcion', e.target.value)} onBlur={() => setTimeout(() => updateTicket(t.id, 'showSuggestions', false), 200)} className="w-full p-2 pl-9 border-2 border-transparent focus:border-indigo-300 rounded-lg outline-none font-bold text-indigo-800" /></div>
                      {sugerencias.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border-2 border-indigo-200 rounded-xl shadow-xl overflow-hidden">
                          {sugerencias.map(prod => (
                            <div key={prod.id} onMouseDown={(e) => { e.preventDefault(); selectProduct(t.id, prod); }} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-indigo-50 last:border-0 flex justify-between items-center">
                              <div><div className="font-bold text-indigo-900">{prod.nombre}</div>{prod.codigoInterno && <div className="text-xs text-indigo-400 font-mono">SKU: {prod.codigoInterno}</div>}</div>
                              <div className="text-sm font-bold text-slate-600">${(Number(prod.precio) * (1 + Number(prod.ivaTasa))).toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top"><input type="number" min="1" value={t.cantidad || ''} onChange={e => updateTicket(t.id, 'cantidad', e.target.value)} className="w-full p-2 border-2 border-transparent focus:border-indigo-300 rounded-lg outline-none font-mono font-bold text-center" /></td>
                    <td className="px-4 py-3 align-top"><div className="relative"><span className="absolute left-2 top-2 text-slate-400">$</span><input type="number" placeholder="0.00" value={t.total || ''} onChange={e => updateTicket(t.id, 'total', e.target.value)} className="w-full p-2 pl-6 text-right border-2 border-transparent focus:border-indigo-300 rounded-lg outline-none font-mono font-bold" /></div></td>
                    <td className="px-4 py-3 text-center align-top pt-5">{tickets.length > 1 && (<button onClick={() => removeTicket(t.id)} className="text-red-300 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start pb-12">
          <div className="flex-1 bg-amber-50 p-5 rounded-2xl border border-amber-100 flex gap-3 text-amber-800"><Info className="w-6 h-6 shrink-0 mt-1" /><div className="text-sm space-y-1"><p>El folio puede quedar vacío. Al cambiar la cantidad de un producto sugerido, el total se actualizará.</p></div></div>
          <div className="w-full md:w-80 bg-white p-6 rounded-2xl border-2 border-slate-300 shadow-sm space-y-3">
            <div className="flex justify-between text-slate-500"><span>Subtotal:</span><span className="font-mono font-bold">{fmt(resumen.subtotal)}</span></div>
            <div className="flex justify-between text-slate-500"><span>IVA (16%):</span><span className="font-mono font-bold">{fmt(resumen.iva)}</span></div>
            <div className="flex justify-between text-slate-900 font-black text-xl pt-3 border-t-2 border-slate-100"><span>Total:</span><span>{fmt(resumen.total)}</span></div>
            <button onClick={handleTimbrar} disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} {loading ? 'Guardando...' : 'Crear Factura Global'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}