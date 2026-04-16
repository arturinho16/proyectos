"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EmpleadosPage() {
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Estado para Selección (Checkboxes)
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        fetch('/api/empleados')
            .then(res => {
                if (!res.ok) throw new Error("Error al cargar la lista de empleados");
                return res.json();
            })
            .then(data => {
                setEmpleados(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    // ==========================================
    // Lógica de Paginación
    // ==========================================
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentEmpleados = empleados.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(empleados.length / itemsPerPage);

    // ==========================================
    // Lógica de Selección
    // ==========================================
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Selecciona todos los de la página actual
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

    // ==========================================
    // Exportación a CSV
    // ==========================================
    const handleExportCSV = () => {
        const selectedData = empleados.filter(emp => selectedIds.includes(emp.id));
        if (selectedData.length === 0) return;

        // Cabeceras del CSV
        const headers = ['Num Empleado', 'Nombre Completo', 'RFC', 'CURP', 'NSS', 'Salario', 'Puesto', 'Departamento', 'Estado'];

        // Formateo de las filas
        const csvRows = selectedData.map(emp => [
            emp.numEmpleado || '',
            `"${emp.nombre} ${emp.apellidoPaterno} ${emp.apellidoMaterno || ''}"`.trim(),
            emp.rfc || '',
            emp.curp || '',
            emp.nss || '',
            emp.salario || 0,
            `"${emp.puesto || ''}"`,
            `"${emp.departamento || ''}"`,
            emp.activo ? 'Activo' : 'Inactivo'
        ]);

        const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

        // Crear un Blob y forzar la descarga en el navegador
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'empleados_seleccionados.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="p-6 text-center text-gray-600 font-medium">Cargando directorio...</div>;
    if (error) return <div className="p-6 text-center text-red-500 font-medium">Error: {error}</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header y Botonera Superior */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Directorio de Empleados</h1>

                <div className="flex flex-wrap gap-2">
                    {/* 👇 NUEVO BOTÓN DE REGRESO 👇 */}
                    <Link href="/" className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors">
                        ← Panel
                    </Link>
                    <button
                        onClick={handleExportCSV}
                        disabled={selectedIds.length === 0}
                        className={`px-4 py-2 rounded text-white font-medium transition-colors ${selectedIds.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        Descargar CSV ({selectedIds.length})
                    </button>

                    <Link href="/nomina/facturacion-masiva" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors">
                        Ir a Timbrado Masivo
                    </Link>

                    <Link href="/empleados/nuevo" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
                        + Nuevo Empleado
                    </Link>
                </div>
            </div>

            {/* Tabla de Empleados */}
            <div className="bg-white shadow rounded-lg overflow-x-auto border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={selectedIds.length === currentEmpleados.length && currentEmpleados.length > 0}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">No. Emp</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">RFC / CURP</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Puesto</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Salario Diario</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentEmpleados.map(emp => (
                            <tr key={emp.id} className="hover:bg-blue-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(emp.id)}
                                        onChange={() => handleSelect(emp.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                    {emp.numEmpleado}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                    {emp.nombre} {emp.apellidoPaterno}
                                    <div className="text-xs font-normal text-gray-400">{emp.email || 'Sin correo'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    <div className="font-semibold">{emp.rfc}</div>
                                    <div className="text-xs">{emp.curp}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {emp.puesto || 'N/A'}
                                    <div className="text-xs text-gray-400">{emp.departamento || 'Sin departamento'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-700">
                                    ${Number(emp.salario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    <Link
                                        href={`/empleados/${emp.id}/editar`}
                                        className="text-blue-600 hover:text-blue-800 font-bold underline underline-offset-2"
                                    >
                                        Editar
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {currentEmpleados.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                                    No hay empleados registrados en el sistema.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Controles de Paginación */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-lg shadow border border-gray-200">
                    <span className="text-sm text-gray-600 font-medium">
                        Mostrando del <span className="font-bold">{indexOfFirstItem + 1}</span> al <span className="font-bold">{Math.min(indexOfLastItem, empleados.length)}</span> de {empleados.length}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border rounded font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border rounded font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}