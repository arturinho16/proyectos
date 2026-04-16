"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, FileText, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FacturacionMasivaPage() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [resultados, setResultados] = useState<any[]>([]);
    const [recibos, setRecibos] = useState<any[]>([]);

    // Petición productiva para cargar los recibos listos para timbrar
    useEffect(() => {
        fetchRecibosPendientes();
    }, []);

    const fetchRecibosPendientes = async () => {
        setLoadingInitial(true);
        try {
            // Requerirá un endpoint GET /api/nomina/borradores
            const res = await fetch("/api/nomina/borradores");
            if (res.ok) {
                const data = await res.json();
                setRecibos(data);
            }
        } catch (error) {
            console.error("Error obteniendo recibos:", error);
        } finally {
            setLoadingInitial(false);
        }
    };

    const handleProcesoMasivo = async () => {
        if (!confirm(`¿Estás seguro de timbrar ${recibos.length} recibos de nómina? Consumirá timbres reales.`)) return;

        setIsProcessing(true);
        setResultados([]);

        const recibosIds = recibos.map(r => r.id);

        try {
            const res = await fetch("/api/nomina/timbrado-masivo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recibosIds })
            });

            const data = await res.json();

            if (res.ok) {
                setResultados(data.resultados);
                // Actualiza el estado visual de la tabla tras el éxito
                setRecibos(prev => prev.map(r => ({ ...r, estado: "TIMBRADO" })));
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
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-5xl mx-auto">
                <div className="mb-4">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={18} />
                        Regresar al Panel
                    </Link>
                </div>

                <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
                            <FileText className="text-fuchsia-600" />
                            Nómina Masiva
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Selecciona el periodo y timbra todos los recibos en una sola acción.</p>
                    </div>
                    <div className="md:text-right">
                        <p className="text-sm font-bold text-slate-500">Fecha de emisión:</p>
                        <p className="text-lg font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de proceso:</label>
                            <select className="w-full border border-slate-200 rounded-xl p-3 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-700 font-medium bg-slate-50">
                                <option value="facturacion">Timbrado (Facturación)</option>
                                <option value="cancelacion">Cancelación Masiva</option>
                            </select>
                        </div>

                        <div className="text-center">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">Recibos en cola</p>
                            {loadingInitial ? (
                                <Loader2 className="animate-spin text-blue-500 mx-auto mt-2" size={32} />
                            ) : (
                                <p className="text-4xl font-bold text-blue-600 mt-1">{recibos.length}</p>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleProcesoMasivo}
                                disabled={isProcessing || recibos.length === 0 || loadingInitial}
                                className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white transition-all shadow-md w-full md:w-auto
                  ${isProcessing || recibos.length === 0 ? "bg-slate-400 shadow-none cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"}
                `}
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                Empezar proceso
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-3">
                        <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                        <p><strong>IMPORTANTE:</strong> Asegúrate de que los datos del periodo (días pagados, salarios e impuestos calculados) sean correctos antes de iniciar el proceso. Esta acción ejecutará la firma CSD y consumo de timbres en Finkok.</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-bold">Empleado</th>
                                <th className="px-6 py-4 font-bold">RFC</th>
                                <th className="px-6 py-4 font-bold text-right">Neto a Pagar</th>
                                <th className="px-6 py-4 font-bold text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recibos.length === 0 && !loadingInitial && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">No hay recibos pendientes de timbrar.</td>
                                </tr>
                            )}
                            {recibos.map((recibo) => (
                                <tr key={recibo.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    {/* Se asume que tu API devuelve objeto { empleado: { nombre, apellidoPaterno }, rfc, totalNeto, estado } */}
                                    <td className="px-6 py-4 font-bold text-slate-800">
                                        {recibo.empleado?.nombre} {recibo.empleado?.apellidoPaterno}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{recibo.empleado?.rfc || recibo.rfc}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">${parseFloat(recibo.totalNeto || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border
                      ${recibo.estado === 'BORRADOR' ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
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

                {resultados.length > 0 && (
                    <div className="mt-6 bg-slate-900 rounded-2xl p-5 text-emerald-400 font-mono text-sm overflow-auto h-48 shadow-inner border border-slate-800">
                        <p className="text-slate-400 mb-3 border-b border-slate-800 pb-2 font-bold tracking-widest text-xs uppercase">LOG DEL SAT (FINKOK)</p>
                        {resultados.map((res, i) => (
                            <div key={i} className={`mb-1 ${res.status === 'Error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> Empleado {res.empleado}: {res.status} {res.uuid ? `UUID: ${res.uuid}` : `- ${res.mensaje}`}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}