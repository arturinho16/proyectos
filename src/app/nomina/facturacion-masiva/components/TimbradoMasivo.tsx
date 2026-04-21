'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/shared/Button';
import ProgressBar from './ProgressBar';
import type { NominaRow } from '@/lib/nomina/types';

export default function TimbradoMasivo() {
  const [rows, setRows] = useState<NominaRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [failed, setFailed] = useState(0);

  const load = async () => {
    const res = await fetch('/api/nomina/timbrar');
    const data = await res.json();
    setRows(data?.items ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const run = async () => {
    setProcessing(true);
    setProcessed(0);
    setFailed(0);

    for (const reciboId of selected) {
      const res = await fetch('/api/nomina/timbrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reciboId }),
      });

      if (!res.ok) setFailed((v) => v + 1);
      setProcessed((v) => v + 1);
    }

    setProcessing(false);
    await load();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-bold">Timbrado masivo de nóminas aprobadas</h3>
      <ProgressBar total={selected.length} processed={processed} failed={failed} />

      <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="p-2" />
              <th className="p-2">Empleado</th>
              <th className="p-2">Total</th>
              <th className="p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="p-2"><input type="checkbox" checked={selected.includes(row.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, row.id] : prev.filter((x) => x !== row.id))} /></td>
                <td className="p-2">{row.empleadoNombre}</td>
                <td className="p-2">${row.totalNeto.toFixed(2)}</td>
                <td className="p-2">{row.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={run} loading={processing} disabled={!selected.length}>Timbrar seleccionadas</Button>
    </div>
  );
}
