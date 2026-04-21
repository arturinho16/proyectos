import { Card } from '@/components/shared/Card';
import type { ConfigFormProps } from './types';

export default function ContadorFolios({ values, onChange }: ConfigFormProps) {
  const porcentaje = values.timbresContratados > 0 ? Math.min(100, Math.round((values.timbresUsados / values.timbresContratados) * 100)) : 0;

  return (
    <Card title="Contador de folios / timbres" color="slate">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label>Serie nómina</label>
          <input value={values.folioNominaSerie} onChange={(e) => onChange('folioNominaSerie', e.target.value.toUpperCase())} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>Folio actual</label>
          <input type="number" value={values.folioNominaActual} onChange={(e) => onChange('folioNominaActual', Number(e.target.value) || 1)} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>Timbres contratados</label>
          <input type="number" value={values.timbresContratados} onChange={(e) => onChange('timbresContratados', Number(e.target.value) || 0)} className="w-full rounded-xl p-2" />
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-slate-100 p-3">
        <p className="text-sm font-semibold text-slate-700">Usados: {values.timbresUsados} · Disponibles: {values.timbresDisponibles}</p>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-[#4F46E5]" style={{ width: `${porcentaje}%` }} />
        </div>
      </div>
    </Card>
  );
}
