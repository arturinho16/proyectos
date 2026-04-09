'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Inbox, Search, Download, Loader2, FileCode, RefreshCw, Archive
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type FacturaRecibida = {
    id: string;
    uuid: string;
    emisorRfc: string;
    emisorNombre: string;
    fechaEmision: string;
    total: number;
    moneda: string;
    estadoSat: string;
    xmlContenido?: string;
};

export default function FacturasRecibidasPage() {
    const [facturas, setFacturas] = useState<FacturaRecibida[]>([]);
    const [loading, setLoading] = useState(true);
    const [sincronizando, setSincronizando] = useState(false);
    const [q, setQ] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const ITEMS_POR_PAGINA = 10;

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/facturas-recibidas');
            const data = await res.json();
            setFacturas(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => { setPaginaActual(1); }, [q]);

    const handleSincronizar = async () => {
        setSincronizando(true);
        try {
            const res = await fetch('/api/facturas-recibidas', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                alert(`❌ Error: ${data.error}`);
                return;
            }
            alert(`✅ ${data.mensaje}`);
            cargar();
        } catch (error) {
            alert('Error de conexión al sincronizar con el SAT.');
        } finally {
            setSincronizando(false);
        }
    };

    const handleVerificarDescargas = async () => {
        setSincronizando(true);
        try {
            const res = await fetch('/api/facturas-recibidas/verificar');
            const data = await res.json();

            if (!res.ok) return alert(`❌ Error: ${data.error}`);

            alert(`ℹ️ ${data.mensaje}`);
            cargar();
        } catch (error) {
            alert('Error al comprobar descargas.');
        } finally {
            setSincronizando(false);
        }
    };

    const handleDescargarXML = (f: FacturaRecibida) => {
        if (!f.xmlContenido) return alert('XML no disponible.');
        const blob = new Blob([f.xmlContenido], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${f.emisorRfc}_${f.uuid}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleConsolidado = async () => {
        if (facturas.length === 0) return alert('No hay facturas para consolidar.');
        const zip = new JSZip();
        const folderXML = zip.folder('Gastos_XML');

        facturas.forEach(f => {
            if (f.xmlContenido) folderXML?.file(`${f.emisorRfc}_${f.uuid}.xml`, f.xmlContenido);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `Gastos_Consolidado_XML.zip`);
    };

    const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
    const fmtFecha = (d: string) => new Date(d).toLocaleDateString('es-MX');

    const facturasFiltradas = facturas.filter(f => {
        const busqueda = q.toLowerCase();
        return !q || f.emisorNombre.toLowerCase().includes(busqueda) || f.emisorRfc.toLowerCase().includes(busqueda) || f.uuid.toLowerCase().includes(busqueda);
    });

    const totalPaginas = Math.ceil(facturasFiltradas.length / ITEMS_POR_PAGINA);
    const startIndex = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const facturasPaginadas = facturasFiltradas.slice(startIndex, startIndex + ITEMS_POR_PAGINA);

    return (
        <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
            <div className="max-w-7xl mx-auto space-y-6 pb-24">

                {/* Encabezado */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold transition-colors">
                            <ArrowLeft className="w-5 h-5" /> Panel
                        </Link>
                        <Inbox className="w-8 h-8 text-pink-600 ml-2" />
                        <h1 className="text-3xl font-bold">Facturas Recibidas</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleConsolidado}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-bold text-base shadow-lg shadow-indigo-100"
                        >
                            <Archive className="w-5 h-5" /> Descargar Consolidado
                        </button>

                        <button
                            onClick={handleVerificarDescargas}
                            disabled={sincronizando}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all font-bold text-base shadow-lg shadow-emerald-100 disabled:opacity-50"
                        >
                            {sincronizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                            {sincronizando ? 'Consultando...' : 'Comprobar Descargas'}
                        </button>

                        <button
                            onClick={handleSincronizar}
                            disabled={sincronizando}
                            className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-xl hover:bg-pink-700 transition-all font-bold text-base shadow-lg shadow-pink-100 disabled:opacity-50"
                        >
                            {sincronizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                            {sincronizando ? 'Conectando...' : 'Sincronizar SAT'}
                        </button>
                    </div>
                </div>

                {/* Buscador */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
                    <Search className="w-6 h-6 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por Proveedor, RFC o UUID..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="w-full outline-none text-slate-700 bg-transparent text-base"
                    />
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-base text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['Fecha', 'Proveedor / RFC', 'UUID', 'Total', 'Estado', 'Acciones'].map(h => (
                                        <th key={h} className="px-6 py-4 text-sm font-bold uppercase text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                                ) : facturasPaginadas.length === 0 ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-slate-500">No hay facturas recibidas sincronizadas.</td></tr>
                                ) : (
                                    facturasPaginadas.map(f => (
                                        <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-slate-600">{fmtFecha(f.fechaEmision)}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{f.emisorNombre}</div>
                                                <div className="text-sm font-mono text-slate-500 uppercase">{f.emisorRfc}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-500">{f.uuid}</td>
                                            <td className="px-6 py-4 font-mono font-bold text-blue-700">{fmt(Number(f.total))}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${f.estadoSat === 'VIGENTE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                    {f.estadoSat}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleDescargarXML(f)} title="Descargar XML" className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                                                        <FileCode className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {totalPaginas > 1 && (
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between mt-auto">
                            <span className="text-sm text-slate-500 font-medium">Página {paginaActual} de {totalPaginas} ({facturasFiltradas.length} resultados)</span>
                            <div className="flex gap-2">
                                <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50">Anterior</button>
                                <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50">Siguiente</button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}