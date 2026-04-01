'use client';

import React, { useState, useMemo } from 'react';
import { Globe, ArrowLeft, Save, Plus, Trash2, Calculator, Info, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function FacturaGlobalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Estados de Configuración SAT (Manuales para permitir periodos anteriores)
  const [periodicidad, setPeriodicidad] = useState('04'); // Mensual por defecto
  const [mesSat, setMesSat] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [anioSat, setAnioSat] = useState(new Date().getFullYear());

  // Listado de Tickets
  const [tickets, setTickets] = useState([{ id: Date.now(), folio: '', total: 0 }]);

  // Cálculos de totales (Cálculo Inverso para obtener Subtotal e IVA del 16%)
  const resumen = useMemo(() => {
    const totalGlobal = tickets.reduce((acc, t) => acc + Number(t.total || 0), 0);
    const subtotal = totalGlobal / 1.16;
    const iva = totalGlobal - subtotal;
    return { subtotal, iva, total: totalGlobal };
  }, [tickets]);

  const addTicket = () => setTickets([...tickets, { id: Date.now(), folio: '', total: 0 }]);
  const removeTicket = (id: number) => setTickets(tickets.filter(t => t.id !== id));
  const updateTicket = (id: number, field: string, value: any) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleTimbrar = async () => {
    if (tickets.some(t => !t.folio || t.total <= 0)) {
      alert("Por favor, ingresa el folio y monto de todos los tickets.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        serie: 'G',
        folio: String(Date.now()).slice(-6),
        fecha: new Date().toISOString(),
        lugarExpedicion: '42000',
        moneda: 'MXN',
        tipoCambio: 1,
        formaPago: '01',
        metodoPago: 'PUE',
        tipoComprobante: 'I',
        usoCFDI: 'S01',
        // Datos del Receptor Fijos (Público en General)
        receptorManual: {
          rfc: 'XAXX010101000',
          nombre: 'PUBLICO EN GENERAL',
          cp: '42000',
          regimenFiscal: '616'
        },
        // Información Global SAT
        esGlobal: true,
        periodicidad,
        mes: mesSat,
        anio: anioSat,
        // Conceptos: Un concepto por cada Ticket
        conceptos: tickets.map(t => ({
          noIdentificacion: t.folio, // El folio del ticket va aquí
          claveProdServ: '01010101', // Obligatorio para Global
          claveUnidad: 'ACT',
          unidad: 'Actividad',
          descripcion: `Venta correspondiente al ticket #${t.folio}`,
          cantidad: 1,
          precioUnitario: Number(t.total) / 1.16,
          importe: Number(t.total) / 1.16,
          descuento: 0,
          objetoImpuesto: '02',
          ivaTasa: 0.16,
          iepsTasa: 0,
          ivaImporte: (Number(t.total) / 1.16) * 0.16,
          iepsImporte: 0
        }))
      };

      const res = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/facturas'), 2000);
      } else {
        const err = await res.json();
        alert("Error al timbrar: " + (err.error || 'Desconocido'));
      }
    } catch (error) {
      alert("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto animate-bounce" />
          <h1 className="text-3xl font-bold text-slate-800">¡Factura Global Exitosa!</h1>
          <p className="text-slate-500">Guardando y regresando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/facturas" className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ArrowLeft /></Link>
            <div className="bg-indigo-600 p-2 rounded-xl"><Globe className="text-white w-6 h-6" /></div>
            <h1 className="text-3xl font-bold">Nueva Factura Global</h1>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border-2 border-indigo-100 shadow-sm text-right">
            <span className="text-xs font-bold text-slate-400 uppercase block">Total a Timbrar</span>
            <span className="text-2xl font-black text-indigo-600">
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(resumen.total)}
            </span>
          </div>
        </div>

        {/* Configuración de Información Global (Manual) */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-300 shadow-sm">
          <h3 className="text-sm font-black text-indigo-600 uppercase mb-4 flex items-center gap-2">
            <Info className="w-4 h-4" /> Configuración del Periodo (SAT)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-black text-slate-500 uppercase">Periodicidad</label>
              <select
                value={periodicidad}
                onChange={e => setPeriodicidad(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold"
              >
                {PERIODICIDADES.map(p => <option key={p.c} value={p.c}>{p.d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-black text-slate-500 uppercase">Mes correspondiente</label>
              <select
                value={mesSat}
                onChange={e => setMesSat(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold"
              >
                {MESES.map(m => <option key={m.c} value={m.c}>{m.d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-black text-slate-500 uppercase">Año</label>
              <select
                value={anioSat}
                onChange={e => setAnioSat(Number(e.target.value))}
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-bold"
              >
                {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Listado de Tickets */}
        <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b-2 border-slate-200 flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2 text-slate-600 uppercase text-sm">
              <Calculator className="w-4 h-4" /> Tickets a incluir en la global
            </h2>
            <button onClick={addTicket} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md">
              <Plus className="w-4 h-4" /> Agregar Ticket
            </button>
          </div>

          <table className="w-full text-base">
            <thead className="bg-slate-50 text-slate-400 text-xs font-black uppercase">
              <tr>
                <th className="px-6 py-4 text-left">Folio del Ticket / Nota</th>
                <th className="px-6 py-4 text-right w-56">Monto con IVA ($)</th>
                <th className="px-6 py-4 text-center w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((t, index) => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3">
                    <input
                      placeholder="Ej. T-1001"
                      value={t.folio}
                      onChange={e => updateTicket(t.id, 'folio', e.target.value)}
                      className="w-full p-2 border-2 border-transparent focus:border-indigo-300 rounded-lg outline-none font-mono font-bold text-indigo-700 placeholder:font-normal"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-slate-400">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={t.total || ''}
                        onChange={e => updateTicket(t.id, 'total', e.target.value)}
                        className="w-full p-2 pl-6 text-right border-2 border-transparent focus:border-indigo-300 rounded-lg outline-none font-mono font-bold"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    {tickets.length > 1 && (
                      <button onClick={() => removeTicket(t.id)} className="text-red-300 hover:text-red-600 p-2 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen Final y Botón */}
        <div className="flex flex-col md:flex-row gap-6 items-start pb-12">
          <div className="flex-1 bg-amber-50 p-5 rounded-2xl border border-amber-100 flex gap-3 text-amber-800">
            <Info className="w-6 h-6 shrink-0 mt-1" />
            <div className="text-sm space-y-1">
              <p><strong>Nota importante:</strong> El sistema usará automáticamente el RFC <strong>XAXX010101000</strong>.</p>
              <p>Se desglosará el IVA del 16% sobre el monto total de cada ticket ingresado.</p>
            </div>
          </div>

          <div className="w-full md:w-80 bg-white p-6 rounded-2xl border-2 border-slate-300 shadow-sm space-y-3">
            <div className="flex justify-between text-slate-500"><span>Subtotal:</span><span className="font-mono font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(resumen.subtotal)}</span></div>
            <div className="flex justify-between text-slate-500"><span>IVA (16%):</span><span className="font-mono font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(resumen.iva)}</span></div>
            <div className="flex justify-between text-slate-900 font-black text-xl pt-3 border-t-2 border-slate-100">
              <span>Total:</span>
              <span>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(resumen.total)}</span>
            </div>
            <button
              onClick={handleTimbrar}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
              {loading ? 'Timbrando...' : 'Emitir Factura Global'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}