'use client';

import type React from 'react';
import { Card } from '@/components/shared/Card';
import type { ConfigFormProps } from './types';

async function toBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export default function CertificadosDigitales({ values, onChange }: ConfigFormProps) {
  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>, field: 'csdCertificadoBase64' | 'csdLlaveBase64') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validExt = field === 'csdCertificadoBase64' ? '.cer' : '.key';
    if (!file.name.toLowerCase().endsWith(validExt)) {
      alert(`Archivo inválido, se esperaba ${validExt}`);
      return;
    }
    const base64 = await toBase64(file);
    onChange(field, base64);
  };

  return (
    <Card title="Certificados digitales (CSD)" color="orange">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label>Archivo .cer</label>
          <input type="file" accept=".cer" onChange={(e) => handleFile(e, 'csdCertificadoBase64')} className="w-full rounded-xl p-2" />
          <p className="mt-1 text-xs text-slate-500">{values.csdCertificadoBase64 ? '✅ Cargado' : 'Pendiente'}</p>
        </div>
        <div>
          <label>Archivo .key</label>
          <input type="file" accept=".key" onChange={(e) => handleFile(e, 'csdLlaveBase64')} className="w-full rounded-xl p-2" />
          <p className="mt-1 text-xs text-slate-500">{values.csdLlaveBase64 ? '✅ Cargado' : 'Pendiente'}</p>
        </div>
        <div>
          <label>Contraseña CSD</label>
          <input type="password" value={values.csdPasswordEncrypted ?? ''} onChange={(e) => onChange('csdPasswordEncrypted', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
        <div>
          <label>No. Certificado</label>
          <input value={values.csdNoCertificado ?? ''} onChange={(e) => onChange('csdNoCertificado', e.target.value)} className="w-full rounded-xl p-2" />
        </div>
      </div>
    </Card>
  );
}
