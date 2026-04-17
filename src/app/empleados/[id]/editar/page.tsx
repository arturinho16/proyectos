"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, User } from 'lucide-react';

export default function EditarEmpleadoPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    // Desenvolvemos los params con React.use() (Requisito de Next.js 15)
    const { id } = use(params);

    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Cargar los datos
    useEffect(() => {
        // Ahora usamos la variable `id` que ya desenvolvemos
        fetch(`/api/empleados/${id}`)
            .then(res => {
                if (!res.ok) throw new Error("No se pudo encontrar la información del empleado.");
                return res.json();
            })
            .then(data => {
                if (data.fechaRelacionLaboral) {
                    data.fechaRelacionLaboral = new Date(data.fechaRelacionLaboral).toISOString().split('T')[0];
                }
                setFormData(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 2. Enviar los cambios
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const res = await fetch(`/api/empleados/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const dataError = await res.json();
                throw new Error(dataError.error || 'Ocurrió un error al guardar los cambios.');
            }

            alert('¡Empleado actualizado correctamente!');
            router.push('/empleados');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 gap-2 font-medium">
                <Loader2 className="animate-spin" /> Cargando expediente...
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/empleados" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={18} />
                        Regresar a Empleados
                    </Link>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50">
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <User className="text-blue-600" /> Editar Expediente de {formData.nombre}
                        </h1>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Datos Personales */}
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Número de Empleado *</label>
                            <input required type="text" name="numEmpleado" value={formData.numEmpleado || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Nombre(s) *</label>
                            <input required type="text" name="nombre" value={formData.nombre || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Apellido Paterno *</label>
                            <input required type="text" name="apellidoPaterno" value={formData.apellidoPaterno || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Apellido Materno</label>
                            <input type="text" name="apellidoMaterno" value={formData.apellidoMaterno || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                        </div>

                        {/* Datos Fiscales / Laborales */}
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">RFC *</label>
                            <input required type="text" name="rfc" value={formData.rfc || ''} onChange={handleChange} maxLength={13} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">CURP *</label>
                            <input required type="text" name="curp" value={formData.curp || ''} onChange={handleChange} maxLength={18} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Número de Seguridad Social (NSS)</label>
                            <input type="text" name="nss" value={formData.nss || ''} onChange={handleChange} maxLength={11} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Código Postal Fiscal *</label>
                            <input required type="text" name="cp" value={formData.cp || ''} onChange={handleChange} maxLength={5} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        {/* Datos de Empresa */}
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Departamento</label>
                            <input type="text" name="departamento" value={formData.departamento || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Puesto</label>
                            <input type="text" name="puesto" value={formData.puesto || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Salario Diario Ordinario *</label>
                            <input required type="number" step="0.01" name="salario" value={formData.salario || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-600">Fecha Inicio Relación Laboral *</label>
                            <input required type="date" name="fechaRelacionLaboral" value={formData.fechaRelacionLaboral || ''} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <Link href="/empleados" className="px-5 py-2.5 text-slate-600 font-bold text-sm bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-colors disabled:opacity-50">
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}