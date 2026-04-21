import React from 'react';

type Estado = 'Pendiente' | 'Aprobada' | 'Timbrada' | 'Error' | string;

const styles: Record<string, string> = {
  Pendiente: 'bg-amber-100 text-amber-800 border-amber-200',
  Aprobada: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Timbrada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Error: 'bg-rose-100 text-rose-800 border-rose-200',
};

export function StatusBadge({ estado }: { estado: Estado }) {
  const style = styles[estado] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${style}`}>{estado}</span>;
}
