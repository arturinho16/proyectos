'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Settings, Building2, Users, ShieldCheck,
    Save, PlusCircle, Edit2, Trash2, Key, UploadCloud
} from 'lucide-react';

export default function ConfiguracionPage() {
    const [activeTab, setActiveTab] = useState<'perfil' | 'usuarios' | 'certificados'>('perfil');

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* ENCABEZADO */}
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold transition-colors">
                        <ArrowLeft className="w-5 h-5" /> Panel
                    </Link>
                    <Settings className="w-8 h-8 text-blue-600 ml-2" />
                    <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
                </div>

                <div className="flex flex-col md:flex-row gap-8">

                    {/* MENÚ LATERAL */}
                    <div className="w-full md:w-64 shrink-0 space-y-2">
                        <button
                            onClick={() => setActiveTab('perfil')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'perfil' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            <Building2 className="w-5 h-5" /> Perfil Fiscal
                        </button>
                        <button
                            onClick={() => setActiveTab('usuarios')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'usuarios' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            <Users className="w-5 h-5" /> Usuarios
                        </button>
                        <button
                            onClick={() => setActiveTab('certificados')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'certificados' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            <ShieldCheck className="w-5 h-5" /> Sellos y FIEL
                        </button>
                    </div>

                    {/* ÁREA DE CONTENIDO */}
                    <div className="flex-1">

                        {/* 1. PERFIL FISCAL */}
                        {activeTab === 'perfil' && (
                            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4">
                                <div className="mb-6 border-b border-slate-100 pb-4">
                                    <h2 className="text-xl font-bold text-slate-800">Datos del Emisor</h2>
                                    <p className="text-sm text-slate-500">Configura la información fiscal que aparecerá en tus facturas.</p>
                                </div>

                                <form className="space-y-6" onSubmit={e => e.preventDefault()}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1 col-span-1 md:col-span-2">
                                            <label className="text-xs font-bold uppercase text-slate-500">Nombre o Razón Social</label>
                                            <input type="text" placeholder="OMAR ARTURO CORONA MONROY" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-medium text-slate-700" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-slate-500">RFC</label>
                                            <input type="text" placeholder="COMO891216CM1" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-mono text-slate-700 uppercase" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-slate-500">Código Postal</label>
                                            <input type="text" placeholder="42000" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-mono text-slate-700" />
                                        </div>
                                        <div className="space-y-1 col-span-1 md:col-span-2">
                                            <label className="text-xs font-bold uppercase text-slate-500">Régimen Fiscal</label>
                                            <select className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-medium text-slate-700">
                                                <option>626 - Régimen Simplificado de Confianza</option>
                                                <option>612 - Personas Físicas con Actividades Empresariales</option>
                                                <option>601 - General de Ley Personas Morales</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1 col-span-1 md:col-span-2">
                                            <label className="text-xs font-bold uppercase text-slate-500">Dirección (Calle, Num, Colonia)</label>
                                            <input type="text" placeholder="Francisco Clavijero 106 Int. 2, Centro" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-medium text-slate-700" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-slate-500">Correo de Contacto</label>
                                            <input type="email" placeholder="contacto@empresa.com" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-medium text-slate-700" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-slate-500">Teléfono</label>
                                            <input type="text" placeholder="7712427953" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-medium text-slate-700" />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button type="button" className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                                            <Save className="w-5 h-5" /> Guardar Perfil
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* 2. USUARIOS */}
                        {activeTab === 'usuarios' && (
                            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4">
                                <div className="mb-6 flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Gestión de Usuarios</h2>
                                        <p className="text-sm text-slate-500">Administra quién tiene acceso al sistema.</p>
                                    </div>
                                    <button type="button" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 text-sm">
                                        <PlusCircle className="w-5 h-5" /> Nuevo Usuario
                                    </button>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-5 py-3 font-bold text-slate-500 uppercase">Nombre</th>
                                                <th className="px-5 py-3 font-bold text-slate-500 uppercase">Correo</th>
                                                <th className="px-5 py-3 font-bold text-slate-500 uppercase">Rol</th>
                                                <th className="px-5 py-3 font-bold text-slate-500 uppercase text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr className="hover:bg-slate-50">
                                                <td className="px-5 py-4 font-bold text-slate-800">Administrador Principal</td>
                                                <td className="px-5 py-4 text-slate-600">admin@tufisti.com</td>
                                                <td className="px-5 py-4"><span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-bold text-xs">ADMIN</span></td>
                                                <td className="px-5 py-4 flex justify-center gap-2">
                                                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar Usuario"><Edit2 className="w-4 h-4" /></button>
                                                    <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Cambiar Contraseña"><Key className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-slate-50">
                                                <td className="px-5 py-4 font-bold text-slate-800">Contador Auxiliar</td>
                                                <td className="px-5 py-4 text-slate-600">contador@ejemplo.com</td>
                                                <td className="px-5 py-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold text-xs">USUARIO</span></td>
                                                <td className="px-5 py-4 flex justify-center gap-2">
                                                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                                    <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"><Key className="w-4 h-4" /></button>
                                                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 3. SELLOS DIGITALES Y FIEL */}
                        {activeTab === 'certificados' && (
                            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4 space-y-8">

                                <div className="border-b border-slate-100 pb-4">
                                    <h2 className="text-xl font-bold text-slate-800">Certificados SAT</h2>
                                    <p className="text-sm text-slate-500">Carga tus archivos para poder timbrar y cancelar facturas de forma automatizada.</p>
                                </div>

                                {/* Bloque CSD */}
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5">
                                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
                                        <ShieldCheck className="w-6 h-6" /> Certificado de Sello Digital (CSD)
                                    </div>
                                    <p className="text-sm text-slate-500">Necesario para <b>Emitir (Timbrar)</b> facturas.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border-2 border-dashed border-slate-300 bg-white rounded-xl p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                                            <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                                            <span className="text-sm font-bold text-slate-600">Subir archivo .CER</span>
                                        </div>
                                        <div className="border-2 border-dashed border-slate-300 bg-white rounded-xl p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                                            <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                                            <span className="text-sm font-bold text-slate-600">Subir archivo .KEY</span>
                                        </div>
                                        <div className="col-span-1 md:col-span-2 space-y-1">
                                            <label className="text-xs font-bold uppercase text-slate-500">Contraseña del CSD</label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                                <input type="password" placeholder="••••••••" className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bloque FIEL */}
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5">
                                    <div className="flex items-center gap-2 text-teal-700 font-bold text-lg">
                                        <Key className="w-6 h-6" /> e.Firma (FIEL)
                                    </div>
                                    <p className="text-sm text-slate-500">Necesaria únicamente para autorizar al PAC o realizar configuraciones avanzadas.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border-2 border-dashed border-slate-300 bg-white rounded-xl p-4 text-center hover:border-teal-400 transition-colors cursor-pointer">
                                            <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                                            <span className="text-sm font-bold text-slate-600">Subir archivo .CER (FIEL)</span>
                                        </div>
                                        <div className="border-2 border-dashed border-slate-300 bg-white rounded-xl p-4 text-center hover:border-teal-400 transition-colors cursor-pointer">
                                            <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                                            <span className="text-sm font-bold text-slate-600">Subir archivo .KEY (FIEL)</span>
                                        </div>
                                        <div className="col-span-1 md:col-span-2 space-y-1">
                                            <label className="text-xs font-bold uppercase text-slate-500">Contraseña de la FIEL</label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                                <input type="password" placeholder="••••••••" className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-teal-500 font-medium" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button type="button" className="flex items-center gap-2 px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-200">
                                        <Save className="w-5 h-5" /> Guardar Certificados
                                    </button>
                                </div>

                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}