"use client";

import { useState, useEffect } from 'react';

export default function TimbradoMasivoNomina() {
    const [recibos, setRecibos] = useState<any[]>([]);
    const [seleccionados, setSeleccionados] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [resultados, setResultados] = useState<any[]>([]);
    const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

    // 1. Cargar recibos en BORRADOR al montar el componente
    // Nota: Deberás tener un endpoint GET /api/nomina/borradores, aquí simulamos la llamada
    /*
    useEffect(() => {
        fetch('/api/nomina/borradores')
            .then(res => res.json())
            .then(data => setRecibos(data))
            .catch(err => console.error("Error cargando borradores", err));
    }, []);
    */

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSeleccionados(recibos.map(r => r.id));
        } else {
            setSeleccionados([]);
        }
    };

    const handleSelect = (id: string) => {
        if (seleccionados.includes(id)) {
            setSeleccionados(seleccionados.filter(s => s !== id));
        } else {
            setSeleccionados([...seleccionados, id]);
        }
    };

    const procesarTimbrado = async () => {
        if (seleccionados.length === 0) {
            alert("Selecciona al menos un recibo para timbrar.");
            return;
        }

        setLoading(true);
        setErrorGlobal(null);
        setResultados([]);

        try {
            const res = await fetch('/api/timbrado-masivo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recibosIds: seleccionados })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error crítico en el servidor al intentar timbrar.');
            }

            setResultados(data.resultados);

            // Quitamos de la lista los que fueron exitosos
            const exitosos = data.resultados.filter((r: any) => r.status === 'Exito').map((r: any) => r.uuid);
            setRecibos(recibos.filter(r => !seleccionados.includes(r.id)));
            setSeleccionados([]);

        } catch (error: any) {
            setErrorGlobal(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Timbrado Masivo de Nómina</h1>

            {errorGlobal && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <strong>Error Crítico:</strong> {errorGlobal}
                </div>
            )}

            {/* Panel de Resultados (Se muestra después de timbrar) */}
            {resultados.length > 0 && (
                <div className="mb-6 bg-white shadow rounded-lg p-4 border-l-4 border-blue-500">
                    <h2 className="text-lg font-bold mb-3">Resumen de Operación</h2>
                    <ul className="space-y-2">
                        {resultados.map((res, i) => (
                            <li key={i} className={`p-2 rounded ${res.status === 'Exito' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                <span className="font-semibold">{res.empleado} - {res.nombre}:</span>{' '}
                                {res.status === 'Exito'
                                    ? `¡Timbrado Exitoso! UUID: ${res.uuid}`
                                    : `Error: ${res.mensaje}`}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Tabla de Selección */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 flex justify-between items-center border-b">
                    <span className="text-sm text-gray-600">
                        {seleccionados.length} recibos seleccionados de {recibos.length}
                    </span>
                    <button
                        onClick={procesarTimbrado}
                        disabled={loading || seleccionados.length === 0}
                        className={`px-4 py-2 text-white rounded font-medium ${loading || seleccionados.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? 'Procesando en Finkok...' : 'Timbrar Seleccionados'}
                    </button>
                </div>

                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input type="checkbox" onChange={handleSelectAll} checked={seleccionados.length === recibos.length && recibos.length > 0} className="rounded border-gray-300" />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodo</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Percepciones</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deducciones</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Neto</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {recibos.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No hay recibos en estado BORRADOR.</td></tr>
                        ) : (
                            recibos.map((recibo) => (
                                <tr key={recibo.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={seleccionados.includes(recibo.id)}
                                            onChange={() => handleSelect(recibo.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {recibo.empleado?.nombre} {recibo.empleado?.apellidoPaterno}
                                        <div className="text-xs text-gray-500">Num: {recibo.empleado?.numEmpleado}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(recibo.fechaInicialPago).toLocaleDateString()} al {new Date(recibo.fechaFinalPago).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                        ${Number(recibo.totalPercepciones).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                                        -${Number(recibo.totalDeducciones).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                        ${Number(recibo.totalNeto).toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}