'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import ChecklistItem from './components/ChecklistItem';
import DatosEmpresa from './components/DatosEmpresa';
import DatosOpcionales from './components/DatosOpcionales';
import CertificadosDigitales from './components/CertificadosDigitales';
import ConfiguracionPAC from './components/ConfiguracionPAC';
import ContadorFolios from './components/ContadorFolios';
import type { ConfiguracionFiscalForm } from './components/types';

const initialState: ConfiguracionFiscalForm = {
  rfc: '',
  razonSocial: '',
  regimenFiscal: '601',
  codigoPostal: '',
  pais: 'MEX',
  pacProveedor: 'FINKOK',
  pacAmbiente: 'demo',
  folioNominaSerie: 'NOM',
  folioNominaActual: 1,
  timbresContratados: 0,
  timbresUsados: 0,
  timbresDisponibles: 0,
};

export default function ConfiguracionFiscalPage() {
  const [values, setValues] = useState<ConfiguracionFiscalForm>(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/configuracion-fiscal');
        const data = await res.json();
        if (data?.configuracion) setValues({ ...initialState, ...data.configuracion });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const checklist = useMemo(
    () => [
      { label: 'Datos obligatorios', complete: Boolean(values.rfc && values.razonSocial && values.regimenFiscal && values.codigoPostal) },
      { label: 'Certificados CSD', complete: Boolean(values.csdCertificadoBase64 && values.csdLlaveBase64 && values.csdPasswordEncrypted) },
      { label: 'Credenciales PAC', complete: Boolean(values.pacProveedor && values.pacAmbiente && values.pacStampUrl) },
      { label: 'Folios y timbres', complete: values.folioNominaActual > 0 },
    ],
    [values],
  );

  const handleChange = <K extends keyof ConfiguracionFiscalForm>(key: K, value: ConfiguracionFiscalForm[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    const payload = {
      ...values,
      timbresDisponibles: Math.max(0, values.timbresContratados - values.timbresUsados),
    };

    const res = await fetch('/api/configuracion-fiscal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setSaving(false);
    setMessage(data?.ok ? '✅ Configuración guardada' : `❌ ${data?.error ?? 'No se pudo guardar'}`);
  };

  if (loading) return <div className="p-6 text-slate-500">Cargando configuración...</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[#4F46E5]/10 p-3">
          <Building2 className="h-7 w-7 text-[#4F46E5]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configuración Fiscal</h1>
          <p className="text-slate-500">Checklist de requisitos para timbrado de nómina CFDI 4.0</p>
        </div>
      </div>

      <Card title="Checklist" color="blue">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {checklist.map((item) => (
            <ChecklistItem key={item.label} label={item.label} complete={item.complete} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DatosEmpresa values={values} onChange={handleChange} />
        <DatosOpcionales values={values} onChange={handleChange} />
        <CertificadosDigitales values={values} onChange={handleChange} />
        <ConfiguracionPAC values={values} onChange={handleChange} />
      </div>

      <ContadorFolios values={values} onChange={handleChange} />

      <div className="flex flex-col items-start gap-2 md:flex-row md:items-center">
        <Button onClick={handleSave} loading={saving}>Guardar configuración</Button>
        {message ? <p className="text-sm font-semibold text-slate-600">{message}</p> : null}
      </div>
    </div>
  );
}
