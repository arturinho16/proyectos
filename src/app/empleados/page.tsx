"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, UploadCloud, Users, ArrowLeft, Download, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EmpleadosPage() {
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Carga de datos productiva
    useEffect(() => {
        fetchEmpleados();
    }, []);

    const fetchEmpleados = async () => {
        setLoading(true);
        try {
            // Se asume que crearás este endpoint (GET)
            const res = await fetch("/api/empleados");
            if (res.ok) {
                const data = await res.json();
                setEmpleados(data);
            }
        } catch (error) {
            console.error("Error al cargar empleados:", error);
        } finally {
            setLoading(false);
        }
    };

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
                fetchEmpleados(); // Recargar la tabla tras la subida masiva
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

    // Función para descargar la plantilla CSV
    const handleDownloadTemplate = () => {
        const headers = "Nombre,ApellidoPaterno,ApellidoMaterno,CURP,SSN,RFC,Calle,Colonia,NumExterior,NumInterior,CP,Localidad,Municipio,Estado,Email,Grupo,Sucursal,FecRelLaboral,Salario,SalarioCuotas,Contrato,RegimenContratacion,RiesgoPuesto,TipoJornada,Banco,CLABE,Periodicidad,Departamento,Puesto,NumEmpleado\n";
        const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "PlantillaEmpleados.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filtrado local
    const empleadosFiltrados = empleados.filter(emp =>
        emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.rfc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-4">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={18} />
                        Regresar al Panel
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Controles */}
                    <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-72">
                                <input
                                    type="text"
                                    placeholder="Buscar empleado por nombre o RFC..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button className="absolute right-0 top-0 bottom-0 bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-r-xl transition-colors">
                                    <Search size={18} />
                                </button>
                            </div>

                            {/* EL BOTÓN AHORA REDIRIGE AL FORMULARIO */}
                            <Link href="/empleados/nuevo" className="flex items-center gap-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-sm ml-4 px-4 py-2.5 rounded-xl transition-colors">
                                <Plus size={18} />
                                Agregar Empleado
                            </Link>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            {/* BOTÓN DESCARGAR PLANTILLA AGREGADO */}
                            <button
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold text-sm bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                            >
                                <Download size={18} />
                                Descargar Plantilla
                            </button>

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
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-sm bg-blue-50 px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                            >
                                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                                {isUploading ? "Procesando..." : "Carga masiva (CSV)"}
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
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                                            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-500" />
                                            Cargando empleados...
                                        </td>
                                    </tr>
                                ) : empleadosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <Users size={48} className="mb-4 opacity-50" />
                                                <p className="text-lg text-slate-600">Aún no cuenta con <span className="font-bold text-slate-800">Empleados</span> registrados,</p>
                                                <p className="text-sm mt-1">para agregar de click en el botón <span className="font-bold">Agregar Empleado</span> o usa la carga masiva.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    empleadosFiltrados.map((emp, index) => (
                                        <tr key={index} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium">{emp.puesto || 'N/A'}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900">{emp.nombre} {emp.apellidoPaterno} {emp.apellidoMaterno}</td>
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