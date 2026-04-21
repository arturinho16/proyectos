import { Card } from '@/components/shared/Card';
import type { ConfigFormProps } from './types';

export default function DatosEmpresa({ values, onChange }: ConfigFormProps) {
  return (
    <Card title="Datos obligatorios de la empresa" color="blue">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>RFC</label>
          <input value={values.rfc} onChange={(e) => onChange('rfc', e.target.value.toUpperCase())} className="w-full rounded-xl p-2" maxLength={13} />
        </div>
        <div>
          <label>Razón social</label>
          <input value={values.razonSocial} onChange={(e) => onChange('razonSocial', e.target.value.toUpperCase())} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>Régimen fiscal</label>
          <input value={values.regimenFiscal} onChange={(e) => onChange('regimenFiscal', e.target.value)} className="w-full rounded-xl p-2" placeholder="601" />
        </div>
        <div>
          <label>Código Postal</label>
          <input value={values.codigoPostal} onChange={(e) => onChange('codigoPostal', e.target.value)} className="w-full rounded-xl p-2" maxLength={5} />
        </div>
        <div>
          <label>País</label>
          <input value={values.pais} onChange={(e) => onChange('pais', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>Registro Patronal</label>
          <input value={values.registroPatronal ?? ''} onChange={(e) => onChange('registroPatronal', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
      </div>
    </Card>
  );
}
