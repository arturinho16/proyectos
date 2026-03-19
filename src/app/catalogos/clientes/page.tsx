'use client';

import { useEffect, useRef, useState } from 'react';
import { Users, Upload, UserPlus, X, Trash2, Edit, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { REGIMENES_FISCALES, USOS_CFDI } from '@/lib/sat/catalogos';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Client = {
  id: string;
  rfc: string;
  nombreRazonSocial: string;
  regimenFiscal: string;
  cp: string;
  usoCfdiDefault?: string;
  email?: string | null;
  emailOpcional1?: string | null;
  emailOpcional2?: string | null;
  telefono?: string | null;
  celular?: string | null;
  tipoPersona?: string | null;
  calle?: string | null;
  numExterior?: string | null;
  numInterior?: string | null;
  colonia?: string | null;
  municipio?: string | null;
  estado?: string | null;
  pais?: string | null;
};

type CIFParsed = Omit<Client, 'id'>;

// ─── Fila de verificación en el modal ────────────────────────────────────────
function Row({ label, value, important }: { label: string; value?: string | null; important?: boolean }) {
  const v = (value ?? '').trim();
  const missing = important && !v;
  return (
    <div className={`flex gap-3 px-4 py-3 ${missing ? 'bg-amber-50' : ''}`}>
      <div className="w-56 text-xs font-bold uppercase text-slate-500">
        {label}{important ? <span className="text-red-500">*</span> : null}
      </div>
      <div className={`text-sm font-mono ${missing ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>
        {v || (important ? 'FALTA' : '—')}
      </div>
    </div>
  );
}

// ─── Modal de verificación CIF ────────────────────────────────────────────────
function CIFVerifyModal({
  data, onClose, onEdit, onConfirmSave,
}: {
  data: CIFParsed;
  onClose: () => void;
  onEdit: () => void;
  onConfirmSave: () => void;
}) {
  const requiredMissing = !data.rfc?.trim() || !data.nombreRazonSocial?.trim() || !data.cp?.trim() || !data.regimenFiscal?.trim();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b">
          <div>
            <div className="text-lg font-bold text-slate-900">Verificar datos de la CIF</div>
            <div className="text-xs text-slate-500">Confirma antes de guardar el cliente</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="p-6">
          {requiredMissing ? (
            <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              Faltan campos obligatorios. Da clic en <b>"Editar y completar"</b>.
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm">
              ✅ CIF leída correctamente. Puedes guardar directo o editar.
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            <Row label="RFC" value={data.rfc} important />
            <Row label="Nombre / Razón Social" value={data.nombreRazonSocial} important />
            <Row label="CP Fiscal" value={data.cp} important />
            <Row label="Régimen Fiscal" value={data.regimenFiscal} important />
            <Row label="Uso CFDI" value={data.usoCfdiDefault} />
            <Row label="Calle" value={data.calle} />
            <Row label="No. Exterior" value={data.numExterior} />
            <Row label="No. Interior" value={data.numInterior} />
            <Row label="Colonia" value={data.colonia} />
            <Row label="Municipio/Localidad" value={data.municipio} />
            <Row label="Estado" value={data.estado} />
            <Row label="País" value={data.pais || 'MEXICO'} />
          </div>
        </div>
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 border-2 border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100">Cancelar</button>
          <button onClick={onEdit} className="px-5 py-2.5 border-2 border-blue-400 text-blue-700 font-bold rounded-xl hover:bg-blue-50">Editar y completar</button>
          <button
            onClick={onConfirmSave}
            disabled={requiredMissing}
            className={`px-6 py-2.5 font-bold rounded-xl shadow-lg ${requiredMissing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'}`}
          >
            Confirmar y guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulario reutilizable (crear y editar) ─────────────────────────────────
function ClientForm({
  initial,
  onSubmit,
  onCancel,
  title,
  submitLabel,
}: {
  initial?: Partial<Client>;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  title: string;
  submitLabel: string;
}) {
  const [showDireccion, setShowDireccion] = useState(!!initial?.calle);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData) as Record<string, string>;
    try {
      await onSubmit(body);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-10">
      <h2 className="text-lg font-bold mb-6 text-blue-900">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* RFC + Nombre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">RFC *</label>
            <input name="rfc" defaultValue={initial?.rfc || ''} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none uppercase" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">Nombre / Razón Social *</label>
            <input name="nombreRazonSocial" defaultValue={initial?.nombreRazonSocial || ''} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none uppercase" required />
          </div>
        </div>

        {/* CP + Régimen + Uso CFDI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-blue-700">Código Postal Fiscal *</label>
            <input name="cp" defaultValue={initial?.cp || ''} maxLength={5} className="w-full p-2.5 border border-blue-200 rounded-xl bg-white outline-none" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-blue-700">Régimen Fiscal *</label>
            <select name="regimenFiscal" defaultValue={initial?.regimenFiscal || ''} className="w-full p-2.5 border border-blue-200 rounded-xl bg-white outline-none" required>
              <option value="" disabled>Selecciona…</option>
              {REGIMENES_FISCALES.map((r: any) => (
                <option key={r.clave} value={r.clave}>{r.clave} - {r.descripcion}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-blue-700">Uso CFDI por Defecto</label>
            <select name="usoCfdiDefault" defaultValue={initial?.usoCfdiDefault || 'G03'} className="w-full p-2.5 border border-blue-200 rounded-xl bg-white outline-none">
              {USOS_CFDI.map((u: any) => (
                <option key={u.clave} value={u.clave}>{u.clave} - {u.descripcion}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Email (opcional) + Teléfono */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">
              Email <span className="text-slate-400 font-normal normal-case">(opcional)</span>
            </label>
            <input
              name="email"
              type="email"
              defaultValue={initial?.email || ''}
              placeholder="correo@ejemplo.com"
              className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">
              Teléfono <span className="text-slate-400 font-normal normal-case">(opcional)</span>
            </label>
            <input name="telefono" defaultValue={initial?.telefono || ''} className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none" />
          </div>
        </div>

        {/* Dirección (colapsable) */}
        <div className="border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase text-slate-500">📍 Dirección (Opcional — para PDF)</div>
            <button type="button" onClick={() => setShowDireccion(v => !v)} className="text-blue-700 font-bold text-sm">
              {showDireccion ? 'Ocultar ▲' : 'Mostrar ▼'}
            </button>
          </div>
          {showDireccion && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Calle / Vialidad</label>
                <input name="calle" defaultValue={initial?.calle || ''} className="w-full p-2 border rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">No. Exterior</label>
                <input name="numExterior" defaultValue={initial?.numExterior || ''} className="w-full p-2 border rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">No. Interior</label>
                <input name="numInterior" defaultValue={initial?.numInterior || ''} className="w-full p-2 border rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Colonia</label>
                <input name="colonia" defaultValue={initial?.colonia || ''} className="w-full p-2 border rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Municipio / Localidad</label>
                <input name="municipio" defaultValue={initial?.municipio || ''} className="w-full p-2 border rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Estado</label>
                <input name="estado" defaultValue={initial?.estado || ''} className="w-full p-2 border rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">País</label>
                <input name="pais" defaultValue={initial?.pais || 'MEXICO'} className="w-full p-2 border rounded-xl" />
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={onCancel} className="px-6 py-2.5 border-2 border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-100">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-60">
            {saving ? 'Guardando…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo: null = tabla, 'create' = nuevo, 'edit' = editar
  const [mode, setMode] = useState<null | 'create' | 'edit'>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [parsedCIF, setParsedCIF] = useState<CIFParsed | null>(null);
  const [showCIFModal, setShowCIFModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Cargar clientes ────────────────────────────────────────────────────────
  const fetchClients = async () => {
    setLoading(true);
    const res = await fetch('/api/clients');
    const data = await res.json();
    setClients(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  // ── Subir y parsear CIF ────────────────────────────────────────────────────
  const handleCIF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('cif', file);
      const res = await fetch('/api/clients/parse-cif', { method: 'POST', body: fd });
      if (!res.ok) { alert('No se pudo leer la CIF. Captura manualmente.'); setMode('create'); return; }
      const data = await res.json();
      const upper: CIFParsed = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, typeof v === 'string' && k !== 'email' ? v.toUpperCase() : v])
      ) as CIFParsed;
      if (!upper.usoCfdiDefault) upper.usoCfdiDefault = 'G03';
      setParsedCIF(upper);
      setShowCIFModal(true);
    } catch {
      alert('No se pudo leer la CIF. Captura manualmente.');
      setMode('create');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Crear cliente ──────────────────────────────────────────────────────────
  const createClient = async (body: Record<string, string>) => {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo guardar');
    }
  };

  // ── Actualizar cliente ─────────────────────────────────────────────────────
  const updateClient = async (id: string, body: Record<string, string>) => {
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'No se pudo actualizar');
    }
  };

  // ── Eliminar cliente ───────────────────────────────────────────────────────
  const deleteClient = async (id: string) => {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (res.ok) fetchClients();
    else alert('❌ No se pudo eliminar');
  };

  // ── Confirmar desde modal CIF ──────────────────────────────────────────────
  const onConfirmSaveFromModal = async () => {
    if (!parsedCIF) return;
    try {
      await createClient(parsedCIF as any);
      setShowCIFModal(false);
      setParsedCIF(null);
      await fetchClients();
      alert('✅ Cliente guardado correctamente');
    } catch (e: any) {
      alert('❌ Error: ' + (e?.message || 'No se pudo guardar'));
    }
  };

  const resetForm = () => { setMode(null); setParsedCIF(null); setEditingClient(null); };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="max-w-6xl mx-auto">

        {/* Header */}

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mr-2">
              <ArrowLeft className="w-4 h-4" /> Panel
            </Link>
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Catálogo de Clientes</h1>
          </div>
          <div className="flex gap-3">

            <label className="flex items-center gap-2 bg-white border-2 border-blue-300 text-blue-700 font-bold px-4 py-2 rounded-xl cursor-pointer hover:bg-blue-50 transition-all">
              <Upload className="w-4 h-4" />
              Subir CIF (PDF)
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleCIF} />
            </label>
            <button
              onClick={() => { setMode(mode === 'create' ? null : 'create'); setParsedCIF(null); setEditingClient(null); }}
              className="flex items-center gap-2 bg-blue-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          </div>
        </div>

        {/* Modal verificación CIF */}
        {showCIFModal && parsedCIF && (
          <CIFVerifyModal
            data={parsedCIF}
            onClose={() => setShowCIFModal(false)}
            onEdit={() => { setShowCIFModal(false); setMode('create'); }}
            onConfirmSave={onConfirmSaveFromModal}
          />
        )}

        {/* Formulario CREAR */}
        {mode === 'create' && (
          <ClientForm
            title="Nuevo Cliente (CFDI 4.0)"
            submitLabel="Guardar Cliente"
            initial={parsedCIF || undefined}
            onCancel={resetForm}
            onSubmit={async (body) => {
              try {
                await createClient(body);
                alert('✅ Cliente guardado correctamente');
                resetForm();
                fetchClients();
              } catch (err: any) {
                alert('❌ Error: ' + (err?.message || 'No se pudo guardar'));
              }
            }}
          />
        )}

        {/* Formulario EDITAR */}
        {mode === 'edit' && editingClient && (
          <ClientForm
            title={`Editar Cliente — ${editingClient.nombreRazonSocial}`}
            submitLabel="Guardar Cambios"
            initial={editingClient}
            onCancel={resetForm}
            onSubmit={async (body) => {
              try {
                await updateClient(editingClient.id, body);
                alert('✅ Cliente actualizado correctamente');
                resetForm();
                fetchClients();
              } catch (err: any) {
                alert('❌ Error: ' + (err?.message || 'No se pudo actualizar'));
              }
            }}
          />
        )}

        {/* Tabla de clientes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Nombre / RFC</th>
                <th className="p-4 font-bold">Datos Fiscales</th>
                <th className="p-4 font-bold">Contacto</th>
                <th className="p-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-10 text-center text-slate-400">Cargando...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-slate-400">No hay clientes registrados</td></tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-blue-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-blue-900">{c.nombreRazonSocial}</div>
                      <div className="text-xs text-slate-500 font-mono">{c.rfc}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      <div><b>Régimen:</b> {c.regimenFiscal}</div>
                      <div><b>CP:</b> {c.cp}</div>
                      <div><b>Uso CFDI:</b> {c.usoCfdiDefault || 'G03'}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {c.email ? <div>✉️ {c.email}</div> : <div className="text-slate-300 italic">Sin email</div>}
                      {c.telefono && <div>📞 {c.telefono}</div>}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setEditingClient(c); setMode('edit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteClient(c.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}