"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, UploadCloud, Users, ArrowLeft, Download, Loader2, Edit, FileText } from "lucide-react";
import Link from "next/link";

export default function EmpleadosPage() {
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Paginación y Selección ──
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchEmpleados();
    }, []);

    const fetchEmpleados = async () => {
        setLoading(true);
        try {
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
                fetchEmpleados();
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

    const handleDownloadTemplate = () => {
        const headers = "Nombre,ApellidoPaterno,ApellidoMaterno,CURP,NSS,RFC,Calle,Colonia,NumExterior,NumInterior,CP,Localidad,Municipio,Estado,Email,Grupo,Sucursal,FecRelLaboral,Salario,SalarioCuotas,Contrato,RegimenContratacion,RiesgoPuesto,TipoJornada,Banco,CLABE,Periodicidad,Departamento,Puesto,NumEmpleado\n";
        const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "PlantillaEmpleados.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Exportar CSV de Seleccionados ──
    const handleExportCSV = () => {
        const selectedData = empleados.filter(emp => selectedIds.includes(emp.id));
        if (selectedData.length === 0) return;

        const headers = ['Num Empleado', 'Nombre Completo', 'RFC', 'CURP', 'NSS', 'Salario', 'Puesto', 'Departamento'];
        const csvRows = selectedData.map(emp => [
            emp.numEmpleado || '',
            `"${emp.nombre} ${emp.apellidoPaterno} ${emp.apellidoMaterno || ''}"`.trim(),
            emp.rfc || '',
            emp.curp || '',
            emp.nss || '',
            emp.salario || 0,
            `"${emp.puesto || ''}"`,
            `"${emp.departamento || ''}"`
        ]);

        const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'empleados_seleccionados.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Lógica de Filtrado y Paginación ──
    const empleadosFiltrados = empleados.filter(emp =>
        emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.rfc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Resetear a página 1 si se busca algo
    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentEmpleados = empleadosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(empleadosFiltrados.length / itemsPerPage);

    // ── Lógica de Checkboxes ──
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(currentEmpleados.map(emp => emp.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* ── Botón Original de Regresar ── */}
                <div className="mb-4">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={18} />
                        Regresar al Panel
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Controles: Adaptados manteniendo tus estilos redondeados y colores */}
                    <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-4 bg-slate-50">

                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            {/* Input Original */}
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

                            {/* Botón Nuevo Empleado Original */}
                            <Link href="/empleados/nuevo" className="flex items-center gap-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
                                <Plus size={18} />
                                Agregar
                            </Link>

                            {/* Nuevo Enlace Timbrado Masivo (Estilo armónico) */}
                            <Link href="/nomina/facturacion-masiva" className="flex items-center gap-2 bg-white border border-purple-600 text-purple-600 hover:bg-purple-50 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
                                <FileText size={18} />
                                Timbrado Masivo
                            </Link>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            {/* Nuevo Botón Exportar CSV Seleccionados */}
                            <button
                                onClick={handleExportCSV}
                                disabled={selectedIds.length === 0}
                                className={`flex items-center gap-1 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap ${selectedIds.length === 0 ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'}`}
                            >
                                <Download size={18} />
                                CSV ({selectedIds.length})
                            </button>

                            {/* Botón Descargar Plantilla Original */}
                            <button
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold text-sm bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                            >
                                <Download size={18} />
                                Plantilla
                            </button>

                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />

                            {/* Botón Carga Masiva Original */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-sm bg-blue-50 px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                            >
                                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                                {isUploading ? "Procesando..." : "Carga CSV"}
                            </button>
                        </div>
                    </div>

                    {/* Tabla de Empleados con tus estilos originales y columnas adaptadas */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-bold w-12">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={selectedIds.length === currentEmpleados.length && currentEmpleados.length > 0}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4 font-bold">Puesto</th>
                                    <th className="px-6 py-4 font-bold">Nombre del empleado</th>
                                    <th className="px-6 py-4 font-bold">RFC</th>
                                    <th className="px-6 py-4 font-bold text-center">Salario D.</th>
                                    <th className="px-6 py-4 font-bold text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                                            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-500" />
                                            Cargando empleados...
                                        </td>
                                    </tr>
                                ) : empleadosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            {/* Empty State Original */}
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <Users size={48} className="mb-4 opacity-50" />
                                                <p className="text-lg text-slate-600">Aún no cuenta con <span className="font-bold text-slate-800">Empleados</span> registrados,</p>
                                                <p className="text-sm mt-1">para agregar de click en el botón <span className="font-bold text-slate-800">Agregar Empleado</span> o usa la carga masiva.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    currentEmpleados.map((emp) => (
                                        <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(emp.id)}
                                                    onChange={() => handleSelect(emp.id)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-600">{emp.puesto || 'N/A'}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900">{emp.nombre} {emp.apellidoPaterno} {emp.apellidoMaterno}</td>
                                            <td className="px-6 py-4 text-slate-600 font-mono text-xs">{emp.rfc}</td>
                                            <td className="px-6 py-4 text-center font-bold text-green-700">
                                                ${Number(emp.salario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Link
                                                    href={`/empleados/${emp.id}/editar`}
                                                    className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar Empleado"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Controles de Paginación Integrados al diseño Original */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center rounded-b-2xl">
                            <span className="text-sm text-slate-500 font-medium">
                                Mostrando <span className="font-bold text-slate-700">{indexOfFirstItem + 1}</span> a <span className="font-bold text-slate-700">{Math.min(indexOfLastItem, empleadosFiltrados.length)}</span> de {empleadosFiltrados.length}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}