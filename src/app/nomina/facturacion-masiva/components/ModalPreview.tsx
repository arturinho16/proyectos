import { X } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { NominaRow } from '@/lib/nomina/types';

type Props = {
  row: NominaRow | null;
  onClose: () => void;
};

export default function ModalPreview({ row, onClose }: Props) {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Preview de nómina</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div><span className="font-semibold">Empleado:</span> {row.empleadoNombre}</div>
          <div><span className="font-semibold">RFC:</span> {row.empleadoRfc}</div>
          <div><span className="font-semibold">Fecha de pago:</span> {new Date(row.fechaPago).toLocaleDateString('es-MX')}</div>
          <div><span className="font-semibold">Estado:</span> <StatusBadge estado={row.estado === 'APROBADA' ? 'Aprobada' : row.estado === 'TIMBRADA' ? 'Timbrada' : row.estado === 'ERROR' ? 'Error' : 'Pendiente'} /></div>
          <div><span className="font-semibold">Percepciones:</span> ${row.totalPercepciones.toFixed(2)}</div>
          <div><span className="font-semibold">Deducciones:</span> ${row.totalDeducciones.toFixed(2)}</div>
          <div className="md:col-span-2 text-lg font-bold text-[#4F46E5]">Total neto: ${row.totalNeto.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
