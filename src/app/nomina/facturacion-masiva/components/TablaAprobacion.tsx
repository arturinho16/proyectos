'use client';

import { useEffect, useState } from 'react';
import BotonesAprobacion from './BotonesAprobacion';
import ModalPreview from './ModalPreview';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { NominaRow } from '@/lib/nomina/types';

export default function TablaAprobacion() {
  const [rows, setRows] = useState<NominaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<NominaRow | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/nomina/aprobar?estado=PENDIENTE');
    const data = await res.json();
    setRows(data?.items ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-bold">Nóminas pendientes de aprobación</h3>
      {loading ? <p className="text-sm text-slate-500">Cargando...</p> : null}

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">Empleado</th>
              <th className="py-2">Fecha</th>
              <th className="py-2">Total</th>
              <th className="py-2">Estado</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-2">
                  <button onClick={() => setSelected(row)} className="font-semibold text-[#4F46E5] hover:underline">{row.empleadoNombre}</button>
                </td>
                <td className="py-2">{new Date(row.fechaPago).toLocaleDateString('es-MX')}</td>
                <td className="py-2">${row.totalNeto.toFixed(2)}</td>
                <td className="py-2"><StatusBadge estado="Pendiente" /></td>
                <td className="py-2"><BotonesAprobacion reciboId={row.id} onSuccess={load} /></td>
              </tr>
            ))}
            {!rows.length && !loading ? (
              <tr><td className="py-4 text-center text-slate-500" colSpan={5}>No hay nóminas pendientes.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ModalPreview row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
