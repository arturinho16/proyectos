"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, UploadCloud, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EmpleadosPage() {
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Simulación de carga inicial
    useEffect(() => {
        // fetchEmpleados();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/empleados/carga-masiva", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                alert(`Éxito: ${data.message}`);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Error subiendo archivo:", error);
            alert("Hubo un error al procesar el archivo CSV.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* BOTÓN DE REGRESO AL DASHBOARD */}
                <div className="mb-4">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={18} />
                        Regresar al Panel
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Barra superior de controles */}
                    <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative w-64">
                                <input
                                    type="text"
                                    placeholder="Buscar empleado..."
                                    className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button className="absolute right-0 top-0 bottom-0 bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-r-xl transition-colors">
                                    <Search size={18} />
                                </button>
                            </div>

                            <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-sm ml-4">
                                <Plus size={18} />
                                Agregar Empleado
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <select className="border border-slate-200 rounded-xl text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700">
                                <option value="">Seleccionar Grupo</option>
                                <option value="administrativo">Administrativo</option>
                                <option value="operativo">Operativo</option>
                            </select>

                            {/* Input oculto para el CSV */}
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-sm bg-blue-50 px-4 py-2.5 rounded-xl transition-colors"
                            >
                                <UploadCloud size={18} />
                                {isUploading ? "Procesando..." : "Carga masiva de empleados"}
                            </button>
                        </div>
                    </div>

                    {/* Tabla de Empleados */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Puesto</th>
                                    <th className="px-6 py-4 font-bold">Nombre del empleado</th>
                                    <th className="px-6 py-4 font-bold">RFC</th>
                                    <th className="px-6 py-4 font-bold">No. Seguridad Social</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empleados.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <Users size={48} className="mb-4 opacity-50" />
                                                <p className="text-lg text-slate-600">Aún no cuenta con <span className="font-bold text-slate-800">Empleados</span> registrados,</p>
                                                <p className="text-sm mt-1">para agregar de click en el botón <span className="font-bold">Agregar +</span> de la barra superior o usa la carga masiva.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    empleados.map((emp, index) => (
                                        <tr key={index} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">{emp.puesto || 'N/A'}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900">{emp.nombre} {emp.apellidoPaterno}</td>
                                            <td className="px-6 py-4">{emp.rfc}</td>
                                            <td className="px-6 py-4">{emp.nss || 'N/A'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}