"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, FileText, Loader2 } from "lucide-react";

// Tipado simulado para la vista
interface ReciboPendiente {
    id: string;
    empleado: string;
    rfc: string;
    totalNeto: number;
    estado: "BORRADOR" | "TIMBRANDO" | "TIMBRADO" | "ERROR";
}

export default function FacturacionMasivaPage() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultados, setResultados] = useState<any[]>([]);

    // Datos mockeados (En producción, harías un fetch a /api/nomina/recibos?estado=BORRADOR)
    const [recibos, setRecibos] = useState<ReciboPendiente[]>([
        { id: "1", empleado: "JUAN PEREZ", rfc: "PEPJ800101XXX", totalNeto: 5400.00, estado: "BORRADOR" },
        { id: "2", empleado: "MARIA GOMEZ", rfc: "GOMM850202XXX", totalNeto: 6200.50, estado: "BORRADOR" },
        { id: "3", empleado: "CARLOS LOPEZ", rfc: "LOLC900303XXX", totalNeto: 4800.00, estado: "BORRADOR" },
    ]);

    const handleProcesoMasivo = async () => {
        if (!confirm(`¿Estás seguro de timbrar ${recibos.length} recibos de nómina?`)) return;

        setIsProcessing(true);
        setResultados([]);

        const recibosIds = recibos.map(r => r.id);

        try {
            // Llamada al endpoint creado en el paso anterior
            const res = await fetch("/api/nomina/timbrado-masivo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recibosIds })
            });

            const data = await res.json();

            if (res.ok) {
                setResultados(data.resultados);
                // Actualizamos estado visual de la tabla
                setRecibos(prev => prev.map(r => ({ ...r, estado: "TIMBRADO" })));
                alert("Proceso de timbrado masivo finalizado.");
            } else {
                alert(`Error en el proceso: ${data.error}`);
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al intentar timbrar masivamente.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-5xl mx-auto">

                {/* Encabezado */}
                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="text-cyan-600" />
                            Facturación Masiva de Nómina
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Selecciona el periodo y timbra todos los recibos en una sola acción.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Fecha de emisión sugerida:</p>
                        <p className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Panel de Acción */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de proceso:</label>
                            <select className="w-full border border-gray-300 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500">
                                <option value="facturacion">Timbrado (Facturación)</option>
                                <option value="cancelacion">Cancelación Masiva</option>
                            </select>
                        </div>

                        <div className="text-center">
                            <p className="text-sm text-gray-500">Recibos en cola</p>
                            <p className="text-3xl font-bold text-cyan-600">{recibos.length}</p>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleProcesoMasivo}
                                disabled={isProcessing || recibos.length === 0}
                                className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium text-white transition-all shadow-sm
                  ${isProcessing || recibos.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-cyan-500 hover:bg-cyan-600"}
                `}
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                Empezar con el proceso
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 flex items-start gap-2">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <p><strong>IMPORTANTE:</strong> Asegúrate de que los datos del periodo (días pagados, salarios e impuestos calculados) sean correctos antes de iniciar el proceso. Esta acción consumirá timbres de tu paquete Finkok.</p>
                    </div>
                </div>

                {/* Tabla de Resultados / Borradores */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 border-b uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Empleado</th>
                                <th className="px-6 py-3">RFC</th>
                                <th className="px-6 py-3 text-right">Neto a Pagar</th>
                                <th className="px-6 py-3 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recibos.map((recibo) => (
                                <tr key={recibo.id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-800">{recibo.empleado}</td>
                                    <td className="px-6 py-4">{recibo.rfc}</td>
                                    <td className="px-6 py-4 text-right font-medium">${recibo.totalNeto.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border
                      ${recibo.estado === 'BORRADOR' ? 'bg-gray-100 text-gray-600 border-gray-200' : ''}
                      ${recibo.estado === 'TIMBRADO' ? 'bg-green-100 text-green-700 border-green-200' : ''}
                      ${recibo.estado === 'ERROR' ? 'bg-red-100 text-red-700 border-red-200' : ''}
                    `}>
                                            {recibo.estado}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Consola de Resultados Reales (Se muestra al terminar) */}
                {resultados.length > 0 && (
                    <div className="mt-6 bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-auto h-48 shadow-inner">
                        <p className="text-white mb-2 border-b border-gray-700 pb-2">--- LOG DE TIMBRADO MÚLTIPLE ---</p>
                        {resultados.map((res, i) => (
                            <div key={i} className={res.status === 'Error' ? 'text-red-400' : 'text-green-400'}>
                                [{new Date().toLocaleTimeString()}] Empleado {res.empleado}: {res.status} {res.uuid ? `UUID: ${res.uuid}` : `- ${res.mensaje}`}
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}