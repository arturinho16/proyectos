import { Card } from '@/components/shared/Card';
import type { ConfigFormProps } from './types';

export default function ConfiguracionPAC({ values, onChange }: ConfigFormProps) {
  return (
    <Card title="Configuración PAC (Finkok)" color="green">
      <p className="mb-3 text-sm text-slate-600">
        Se precargan variables de entorno cuando existan. No se hardcodean credenciales en código.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>Proveedor</label>
          <input value={values.pacProveedor} onChange={(e) => onChange('pacProveedor', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>Ambiente</label>
          <select value={values.pacAmbiente} onChange={(e) => onChange('pacAmbiente', e.target.value)} className="w-full rounded-xl p-2">
            <option value="demo">Demo</option>
            <option value="prod">Producción</option>
          </select>
        </div>
        <div>
          <label>Usuario PAC</label>
          <input value={values.pacUsuario ?? ''} onChange={(e) => onChange('pacUsuario', e.target.value)} className="w-full rounded-xl p-2" placeholder="FINKOK_USER" />
        </div>
        <div>
          <label>Password PAC</label>
          <input type="password" value={values.pacPasswordEncrypted ?? ''} onChange={(e) => onChange('pacPasswordEncrypted', e.target.value)} className="w-full rounded-xl p-2" placeholder="FINKOK_PASSWORD" />
        </div>
        <div className="md:col-span-2">
          <label>Stamp URL</label>
          <input value={values.pacStampUrl ?? ''} onChange={(e) => onChange('pacStampUrl', e.target.value)} className="w-full rounded-xl p-2" placeholder="https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl" />
        </div>
      </div>
    </Card>
  );
}
