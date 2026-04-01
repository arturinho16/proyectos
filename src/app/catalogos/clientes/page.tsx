'use client';

import { useEffect, useRef, useState } from 'react';
import { Users, Upload, UserPlus, X, Trash2, Edit, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { REGIMENES_FISCALES, USOS_CFDI } from '@/lib/sat/catalogos';

type Client = {
  id: string; rfc: string; nombreRazonSocial: string; regimenFiscal: string; cp: string;
  usoCfdiDefault?: string; email?: string | null; telefono?: string | null;
  calle?: string | null; numExterior?: string | null; numInterior?: string | null;
  colonia?: string | null; municipio?: string | null; estado?: string | null; pais?: string | null;
};
type CIFParsed = Omit<Client, 'id'>;

function Row({ label, value, important }: { label: string; value?: string | null; important?: boolean }) {
  const v = (value ?? '').trim();
  const missing = important && !v;
  return (
    <div className={`flex gap-3 px-4 py-3 ${missing ? 'bg-amber-50' : ''}`}>
      <div className="w-56 text-sm font-bold uppercase text-slate-500">{label}{important ? <span className="text-red-500">*</span> : null}</div>
      <div className={`text-base font-mono ${missing ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>{v || (important ? 'FALTA' : '—')}</div>
    </div>
  );
}

function CIFVerifyModal({ data, onClose, onEdit, onConfirmSave }: { data: CIFParsed; onClose: () => void; onEdit: () => void; onConfirmSave: () => void; }) {
  const requiredMissing = !data.rfc?.trim() || !data.nombreRazonSocial?.trim() || !data.cp?.trim() || !data.regimenFiscal?.trim();
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b">
          <div><div className="text-lg font-bold text-slate-900">Verificar datos de la CIF</div><div className="text-sm text-slate-500">Confirma antes de guardar el cliente</div></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-600" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          {requiredMissing ? <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-base">Faltan campos obligatorios. Da clic en <b>"Editar y completar"</b>.</div> : <div className="mb-4 p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-base">✅ CIF leída correctamente. Puedes guardar directo o editar.</div>}
          <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            <Row label="RFC" value={data.rfc} important /><Row label="Nombre / Razón Social" value={data.nombreRazonSocial} important /><Row label="CP Fiscal" value={data.cp} important /><Row label="Régimen Fiscal" value={data.regimenFiscal} important /><Row label="Uso CFDI" value={data.usoCfdiDefault} /><Row label="Calle" value={data.calle} /><Row label="No. Exterior" value={data.numExterior} /><Row label="No. Interior" value={data.numInterior} /><Row label="Colonia" value={data.colonia} /><Row label="Municipio/Localidad" value={data.municipio} /><Row label="Estado" value={data.estado} /><Row label="País" value={data.pais || 'MEXICO'} />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t flex flex-col sm:flex-row gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 border-2 border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 text-base">Cancelar</button>
          <button onClick={onEdit} className="px-5 py-2.5 border-2 border-blue-400 text-blue-700 font-bold rounded-xl hover:bg-blue-50 text-base">Editar y completar</button>
          <button onClick={onConfirmSave} disabled={requiredMissing} className={`px-6 py-2.5 font-bold rounded-xl shadow-lg text-base ${requiredMissing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'}`}>Confirmar y guardar</button>
        </div>
      </div>
    </div>
  );
}

function ClientForm({ initial, onSubmit, onCancel, title, submitLabel }: { initial?: Partial<Client>; onSubmit: (data: Record<string, string>) => Promise<void>; onCancel: () => void; title: string; submitLabel: string; }) {
  const [showDireccion, setShowDireccion] = useState(!!initial?.calle);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true);
    const formData = new FormData(e.currentTarget);
    try { await onSubmit(Object.fromEntries(formData) as Record<string, string>); } finally { setSaving(false); }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
      <h2 className="text-xl font-bold mb-6 text-blue-900">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1"><label>RFC *</label><input name="rfc" defaultValue={initial?.rfc || ''} className="w-full p-3 uppercase" required /></div>
          <div className="space-y-1"><label>Nombre / Razón Social *</label><input name="nombreRazonSocial" defaultValue={initial?.nombreRazonSocial || ''} className="w-full p-3 uppercase" required /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
          <div className="space-y-1"><label className="!text-blue-800">Código Postal Fiscal *</label><input name="cp" defaultValue={initial?.cp || ''} maxLength={5} className="w-full p-3 border-blue-300" required /></div>
          <div className="space-y-1"><label className="!text-blue-800">Régimen Fiscal *</label><select name="regimenFiscal" defaultValue={initial?.regimenFiscal || ''} className="w-full p-3 border-blue-300" required><option value="" disabled>Selecciona…</option>{REGIMENES_FISCALES.map((r: any) => <option key={r.clave} value={r.clave}>{r.clave} - {r.descripcion}</option>)}</select></div>
          <div className="space-y-1"><label className="!text-blue-800">Uso CFDI por Defecto</label><select name="usoCfdiDefault" defaultValue={initial?.usoCfdiDefault || 'G03'} className="w-full p-3 border-blue-300">{USOS_CFDI.map((u: any) => <option key={u.clave} value={u.clave}>{u.clave} - {u.descripcion}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1"><label>Email <span className="font-normal normal-case text-slate-400">(opcional)</span></label><input name="email" type="email" defaultValue={initial?.email || ''} placeholder="correo@ejemplo.com" className="w-full p-3" /></div>
          <div className="space-y-1"><label>Teléfono <span className="font-normal normal-case text-slate-400">(opcional)</span></label><input name="telefono" defaultValue={initial?.telefono || ''} className="w-full p-3" /></div>
        </div>
        <div className="border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold uppercase text-slate-500">📍 Dirección (Opcional — para PDF)</div>
            <button type="button" onClick={() => setShowDireccion(v => !v)} className="text-blue-700 font-bold text-base hover:underline">{showDireccion ? 'Ocultar ▲' : 'Mostrar ▼'}</button>
          </div>
          {showDireccion && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-1"><label>Calle / Vialidad</label><input name="calle" defaultValue={initial?.calle || ''} className="w-full p-3" /></div>
              <div className="space-y-1"><label>No. Exterior</label><input name="numExterior" defaultValue={initial?.numExterior || ''} className="w-full p-3" /></div>
              <div className="space-y-1"><label>No. Interior</label><input name="numInterior" defaultValue={initial?.numInterior || ''} className="w-full p-3" /></div>
              <div className="space-y-1"><label>Colonia</label><input name="colonia" defaultValue={initial?.colonia || ''} className="w-full p-3" /></div>
              <div className="space-y-1"><label>Municipio / Localidad</label><input name="municipio" defaultValue={initial?.municipio || ''} className="w-full p-3" /></div>
              <div className="space-y-1"><label>Estado</label><input name="estado" defaultValue={initial?.estado || ''} className="w-full p-3" /></div>
              <div className="space-y-1"><label>País</label><input name="pais" defaultValue={initial?.pais || 'MEXICO'} className="w-full p-3" /></div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={onCancel} className="px-6 py-3 border-2 border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-100 text-base">Cancelar</button>
          <button type="submit" disabled={saving} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-60 text-base">{saving ? 'Guardando…' : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<null | 'create' | 'edit'>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [parsedCIF, setParsedCIF] = useState<CIFParsed | null>(null);
  const [showCIFModal, setShowCIFModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Paginación y Búsqueda ───
  const [q, setQ] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  const fetchClients = async () => { setLoading(true); const res = await fetch('/api/clients'); const data = await res.json(); setClients(Array.isArray(data) ? data : []); setLoading(false); };
  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { setPaginaActual(1); }, [q]); // Reset página al buscar

  const handleCIF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const fd = new FormData(); fd.append('cif', file);
      const res = await fetch('/api/clients/parse-cif', { method: 'POST', body: fd });
      if (!res.ok) { alert('No se pudo leer la CIF. Captura manualmente.'); setMode('create'); return; }
      const data = await res.json();
      const upper: CIFParsed = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'string' && k !== 'email' ? v.toUpperCase() : v])) as CIFParsed;
      if (!upper.usoCfdiDefault) upper.usoCfdiDefault = 'G03';
      setParsedCIF(upper); setShowCIFModal(true);
    } catch { alert('No se pudo leer la CIF. Captura manualmente.'); setMode('create'); } finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  const createClient = async (body: Record<string, string>) => { const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || 'No se pudo guardar'); } };
  const updateClient = async (id: string, body: Record<string, string>) => { const res = await fetch(`/api/clients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || 'No se pudo actualizar'); } };
  const deleteClient = async (id: string) => { if (!confirm('¿Eliminar este cliente?')) return; const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' }); if (res.ok) fetchClients(); else alert('❌ No se pudo eliminar'); };

  const onConfirmSaveFromModal = async () => { if (!parsedCIF) return; try { await createClient(parsedCIF as any); setShowCIFModal(false); setParsedCIF(null); await fetchClients(); alert('✅ Cliente guardado correctamente'); } catch (e: any) { alert('❌ Error: ' + (e?.message || 'No se pudo guardar')); } };
  const resetForm = () => { setMode(null); setParsedCIF(null); setEditingClient(null); };

  // ── Filtrado y Paginación ──
  const clientesFiltrados = clients.filter(c => {
    if (!q) return true;
    const busqueda = q.toLowerCase();
    return c.nombreRazonSocial.toLowerCase().includes(busqueda) || c.rfc.toLowerCase().includes(busqueda);
  });
  const totalPaginas = Math.ceil(clientesFiltrados.length / ITEMS_POR_PAGINA);
  const startIndex = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const clientesPaginados = clientesFiltrados.slice(startIndex, startIndex + ITEMS_POR_PAGINA);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-base transition-colors mr-2"><ArrowLeft className="w-5 h-5" /> Panel</Link>
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Catálogo de Clientes</h1>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 bg-white border-2 border-blue-300 text-blue-700 font-bold px-5 py-2.5 rounded-xl cursor-pointer hover:bg-blue-50 transition-all text-base"><Upload className="w-5 h-5" /> Subir CIF (PDF) <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleCIF} /></label>
            <button onClick={() => { setMode(mode === 'create' ? null : 'create'); setParsedCIF(null); setEditingClient(null); }} className="flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 text-base"><UserPlus className="w-5 h-5" /> Nuevo Cliente</button>
          </div>
        </div>

        {showCIFModal && parsedCIF && <CIFVerifyModal data={parsedCIF} onClose={() => setShowCIFModal(false)} onEdit={() => { setShowCIFModal(false); setMode('create'); }} onConfirmSave={onConfirmSaveFromModal} />}
        {mode === 'create' && <ClientForm title="Nuevo Cliente (CFDI 4.0)" submitLabel="Guardar Cliente" initial={parsedCIF || undefined} onCancel={resetForm} onSubmit={async (body) => { try { await createClient(body); alert('✅ Cliente guardado'); resetForm(); fetchClients(); } catch (err: any) { alert('❌ Error: ' + (err?.message || 'Error')); } }} />}
        {mode === 'edit' && editingClient && <ClientForm title={`Editar Cliente — ${editingClient.nombreRazonSocial}`} submitLabel="Guardar Cambios" initial={editingClient} onCancel={resetForm} onSubmit={async (body) => { try { await updateClient(editingClient.id, body); alert('✅ Cliente actualizado'); resetForm(); fetchClients(); } catch (err: any) { alert('❌ Error: ' + (err?.message || 'Error')); } }} />}

        {/* Buscador de clientes */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
          <Search className="w-6 h-6 text-slate-400" />
          <input type="text" placeholder="Buscar por Nombre o RFC..." value={q} onChange={(e) => setQ(e.target.value)} className="w-full outline-none text-slate-700 bg-transparent text-base" />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] text-base">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-sm uppercase tracking-wider border-b border-slate-200"><th className="p-5 font-bold">Nombre / RFC</th><th className="p-5 font-bold">Datos Fiscales</th><th className="p-5 font-bold">Contacto</th><th className="p-5 font-bold text-center">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (<tr><td colSpan={4} className="p-10 text-center text-slate-400">Cargando...</td></tr>)
                  : clientesFiltrados.length === 0 ? (<tr><td colSpan={4} className="p-10 text-center text-slate-400">No se encontraron clientes.</td></tr>)
                    : (clientesPaginados.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5"><div className="font-bold text-blue-900">{c.nombreRazonSocial}</div><div className="text-sm text-slate-500 font-mono mt-1">{c.rfc}</div></td>
                        <td className="p-5 text-base text-slate-600 space-y-1"><div><b className="text-slate-500">Régimen:</b> {c.regimenFiscal}</div><div><b className="text-slate-500">CP:</b> {c.cp}</div><div><b className="text-slate-500">Uso CFDI:</b> {c.usoCfdiDefault || 'G03'}</div></td>
                        <td className="p-5 text-base text-slate-600 space-y-1">{c.email ? <div>✉️ {c.email}</div> : <div className="text-slate-300 italic">Sin email</div>}{c.telefono && <div>📞 {c.telefono}</div>}</td>
                        <td className="p-5">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => { setEditingClient(c); setMode('edit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit className="w-5 h-5" /></button>
                            <button onClick={() => deleteClient(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </td>
                      </tr>
                    )))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 bg-slate-50 mt-auto">
              <span className="text-sm text-slate-500 font-medium">Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_POR_PAGINA, clientesFiltrados.length)} de {clientesFiltrados.length}</span>
              <div className="flex gap-2">
                <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors">Anterior</button>
                <div className="flex items-center justify-center px-4 font-bold text-slate-700 text-sm">Página {paginaActual} de {totalPaginas}</div>
                <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors">Siguiente</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}