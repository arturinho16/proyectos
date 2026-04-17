"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Loader2, Play, CheckCircle, XCircle, FileText, Download, Mail, PlusCircle } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { NominaPDF } from '@/lib/pdf/NominaPDF';

export default function TimbradoMasivoNomina() {
    const [recibos, setRecibos] = useState<any[]>([]);
    const [seleccionados, setSeleccionados] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [resultados, setResultados] = useState<any[]>([]);
    const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

    // 1. Cargar recibos en BORRADOR al montar el componente
    useEffect(() => {
        fetch('/api/nomina/borradores')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setRecibos(data);
                }
            })
            .catch(err => console.error("Error cargando borradores", err));
    }, []);

    // 2. Función para generar borradores de prueba masivos
    const generarBorradoresPrueba = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/nomina/borradores', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert(data.message);
            window.location.reload(); // Recarga para ver los nuevos borradores en la tabla
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

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
            setRecibos(recibos.filter(r => !seleccionados.includes(r.id)));
            setSeleccionados([]);

        } catch (error: any) {
            setErrorGlobal(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async (res: any) => {
        const nominaData = {
            folio: res.uuid ? res.uuid.split('-')[0] : '00000000',
            uuid: res.uuid,
            emisor: {
                nombre: process.env.NEXT_PUBLIC_EMISOR_NOMBRE || "MI EMPRESA SA DE CV",
                rfc: process.env.NEXT_PUBLIC_EMISOR_RFC || "AAA010101AAA",
                registroPatronal: "B7032191100",
                regimenFiscalDesc: "General de Ley Personas Morales",
                direccion: "Calle Falsa 123, Col. Centro, CP 42080 Pachuca, Hgo."
            },
            empleado: {
                numEmpleado: res.empleado || "000",
                nombre: res.nombre,
                curp: res.curp || "MOCKCURP0000000",
                rfc: res.rfc || "XAXX010101000",
                nss: res.nss || "00000000000",
                regimenContratacion: "02",
                puesto: res.puesto || "Empleado",
                departamento: res.departamento || "General"
            },
            fechaInicialPago: "01/04/2026",
            fechaFinalPago: "15/04/2026",
            diasPagados: 15,
            percepciones: res.percepciones || [],
            deducciones: res.deducciones || [],
            totales: {
                totalPercepciones: res.totalPercepciones || 0,
                totalDeducciones: res.totalDeducciones || 0,
                totalNeto: res.totalNeto || 0
            },
            cfdi: {
                cadenaOriginal: "||1.1|...|...",
                selloSat: "kmLczPK0vet...",
                selloCfdi: "...",
                noCertificadoSat: "00001000000504465028",
                fechaTimbrado: new Date().toISOString()
            }
        };

        const blob = await pdf(<NominaPDF nomina={nominaData} />).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Recibo_${res.nombre.replace(/\s+/g, '_')}_${nominaData.folio}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSendEmail = async (uuid: string, email?: string) => {
        alert(`Simulación: Enviando XML y PDF del UUID ${uuid} al correo ${email || 'del empleado'}`);
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* ── Enlaces de Navegación Superiores ── */}
                <div className="mb-4 flex flex-wrap gap-6">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={18} />
                        Regresar al Panel
                    </Link>
                    <Link href="/empleados" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                        <Users size={18} />
                        Regresar a Empleados
                    </Link>
                </div>

                {/* ── Alertas Globales ── */}
                {errorGlobal && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 flex items-start gap-3 shadow-sm">
                        <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="block font-bold">Error Crítico</strong>
                            <span className="text-sm">{errorGlobal}</span>
                        </div>
                    </div>
                )}

                {/* ── Panel de Resultados de Timbrado ── */}
                {resultados.length > 0 && (
                    <div className="mb-6 bg-white shadow-sm rounded-2xl p-5 border border-slate-200 border-l-4 border-l-blue-500">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            Resumen de Operación
                        </h2>
                        <ul className="space-y-3">
                            {resultados.map((res, i) => (
                                <li key={i} className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm ${res.status === 'Exito' ? 'bg-green-50/50 border-green-100 text-green-800' : 'bg-red-50/50 border-red-100 text-red-800'}`}>
                                    <div className="flex items-start gap-3">
                                        {res.status === 'Exito' ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                                        <div>
                                            <span className="font-bold">{res.empleado} - {res.nombre}:</span>{' '}
                                            {res.status === 'Exito'
                                                ? <span className="font-mono bg-white px-2 py-0.5 rounded border border-green-200 ml-2">UUID: {res.uuid}</span>
                                                : <span className="ml-1">{res.mensaje}</span>}
                                        </div>
                                    </div>

                                    {/* BOTONES DE ACCIÓN (Solo si fue exitoso) */}
                                    {res.status === 'Exito' && (
                                        <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-auto">
                                            <button
                                                onClick={() => handleDownloadPDF(res)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg font-medium transition-colors"
                                                title="Descargar PDF"
                                            >
                                                <Download size={16} /> PDF
                                            </button>
                                            <button
                                                onClick={() => handleSendEmail(res.uuid, res.email)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg font-medium transition-colors"
                                                title="Enviar a Correo"
                                            >
                                                <Mail size={16} /> Enviar
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Contenedor Principal (Tabla) ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                    {/* Header de la Tabla */}
                    <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Timbrado Masivo de Nómina</h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                            <span className="text-sm text-slate-500 font-medium">
                                {seleccionados.length} seleccionados de {recibos.length}
                            </span>

                            {/* 👇 AQUÍ ESTÁ EL NUEVO BOTÓN PARA GENERAR BORRADORES 👇 */}
                            <button
                                onClick={generarBorradoresPrueba}
                                disabled={loading}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                                Generar Borradores
                            </button>

                            {/* BOTÓN DE TIMBRAR SELECCIONADOS */}
                            <button
                                onClick={procesarTimbrado}
                                disabled={loading || seleccionados.length === 0}
                                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${loading || seleccionados.length === 0 ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 border border-transparent'}`}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                                {loading ? 'Procesando en Finkok...' : 'Timbrar Seleccionados'}
                            </button>
                        </div>
                    </div>

                    {/* Tabla de Recibos Borrador */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-bold w-12">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={seleccionados.length === recibos.length && recibos.length > 0}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4 font-bold">Empleado</th>
                                    <th className="px-6 py-4 font-bold">Periodo</th>
                                    <th className="px-6 py-4 font-bold text-right">Percepciones</th>
                                    <th className="px-6 py-4 font-bold text-right">Deducciones</th>
                                    <th className="px-6 py-4 font-bold text-right">Neto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recibos.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <FileText size={48} className="mb-4 opacity-50 text-slate-300" />
                                                <p className="text-lg text-slate-600">No hay recibos en estado <span className="font-bold text-slate-800">BORRADOR</span>,</p>
                                                <p className="text-sm mt-1">presiona "Generar Borradores" para crear recibos de prueba para tus empleados.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    recibos.map((recibo) => (
                                        <tr key={recibo.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={seleccionados.includes(recibo.id)}
                                                    onChange={() => handleSelect(recibo.id)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{recibo.empleado?.nombre} {recibo.empleado?.apellidoPaterno}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">Num: {recibo.empleado?.numEmpleado}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {new Date(recibo.fechaInicialPago).toLocaleDateString()} al {new Date(recibo.fechaFinalPago).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700">
                                                ${Number(recibo.totalPercepciones).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-red-600">
                                                -${Number(recibo.totalDeducciones).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-green-700">
                                                ${Number(recibo.totalNeto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </td>
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