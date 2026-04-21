import { Card } from '@/components/shared/Card';
import type { ConfigFormProps } from './types';

export default function DatosOpcionales({ values, onChange }: ConfigFormProps) {
  return (
    <Card title="Datos opcionales" color="purple">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>Nombre comercial</label>
          <input value={values.nombreComercial ?? ''} onChange={(e) => onChange('nombreComercial', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>Representante legal</label>
          <input value={values.representanteLegal ?? ''} onChange={(e) => onChange('representanteLegal', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>Correo</label>
          <input type="email" value={values.email ?? ''} onChange={(e) => onChange('email', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>Teléfono</label>
          <input value={values.telefono ?? ''} onChange={(e) => onChange('telefono', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>Sitio web</label>
          <input value={values.sitioWeb ?? ''} onChange={(e) => onChange('sitioWeb', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>Logo URL</label>
          <input value={values.logoUrl ?? ''} onChange={(e) => onChange('logoUrl', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
      </div>
    </Card>
  );
}
