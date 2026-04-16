"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, UploadCloud, Users } from "lucide-react";

export default function EmpleadosPage() {
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Simulación de carga inicial (Aquí llamarías a un GET /api/empleados)
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
                // refetchEmpleados();
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
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">

                {/* Barra superior de controles */}
                <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                        <div className="relative w-64">
                            <input
                                type="text"
                                placeholder="Buscar empleado..."
                                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <button className="absolute right-0 top-0 bottom-0 bg-cyan-500 hover:bg-cyan-600 text-white px-3 rounded-r-md transition-colors">
                                <Search size={18} />
                            </button>
                        </div>

                        <button className="flex items-center gap-1 text-cyan-500 hover:text-cyan-700 font-medium text-sm ml-4">
                            <Plus size={18} />
                            Agregar Empleado
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <select className="border border-gray-300 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500">
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
                            className="flex items-center gap-1 text-cyan-500 hover:text-cyan-700 font-medium text-sm"
                        >
                            <UploadCloud size={18} />
                            {isUploading ? "Procesando..." : "Carga masiva de empleados"}
                        </button>
                    </div>
                </div>

                {/* Tabla de Empleados */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium">Puesto</th>
                                <th className="px-6 py-3 font-medium">Nombre del empleado</th>
                                <th className="px-6 py-3 font-medium">RFC</th>
                                <th className="px-6 py-3 font-medium">No. Seguridad Social</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empleados.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <Users size={48} className="mb-4 opacity-50" />
                                            <p className="text-lg text-gray-600">Aún no cuenta con <span className="font-semibold text-gray-800">Empleados</span> registrados,</p>
                                            <p className="text-sm">para agregar de click en el botón <span className="font-semibold">Agregar +</span> de la barra superior o usa la carga masiva.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                empleados.map((emp, index) => (
                                    <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">{emp.puesto || 'N/A'}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{emp.nombre} {emp.apellidoPaterno}</td>
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
    );
}