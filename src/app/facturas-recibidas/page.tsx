'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Inbox,
    Search,
    Loader2,
    FileCode,
    FileText,
    RefreshCw,
    Archive,
    Clock,
    ShieldCheck,
    LogOut,
    UploadCloud,
    KeyRound
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { FacturaPDF } from '@/lib/pdf/FacturaPDF';

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

type SolicitudSAT = {
    id: string;
    requestId: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    mensajeSat?: string | null;
    createdAt: string;
};

const ESTADO_SOLICITUD_STYLES: Record<string, string> = {
    PENDIENTE: 'bg-slate-700 text-slate-200',
    EN_PROCESO: 'bg-blue-900/50 text-blue-300',
    COMPLETADA: 'bg-green-900/50 text-green-400',
    SIN_RESULTADOS: 'bg-amber-900/50 text-amber-300',
    DUPLICADA: 'bg-fuchsia-900/50 text-fuchsia-300',
    RECHAZADA: 'bg-red-900/50 text-red-400',
    ERROR: 'bg-red-950/50 text-red-300',
    VENCIDA: 'bg-orange-900/50 text-orange-300',
    RESPALDO_REQUERIDO: 'bg-yellow-800/50 text-yellow-200',
};

// --- DICCIONARIOS SAT Y CONVERTIDOR DE NÚMEROS A LETRAS ---
const CAT_FORMA_PAGO: Record<string, string> = {
    '01': '01 - Efectivo',
    '02': '02 - Cheque nominativo',
    '03': '03 - Transferencia electrónica de fondos',
    '04': '04 - Tarjeta de crédito',
    '28': '28 - Tarjeta de débito',
    '99': '99 - Por definir'
};

const CAT_METODO_PAGO: Record<string, string> = {
    PUE: 'PUE - Pago en una sola exhibición',
    PPD: 'PPD - Pago en parcialidades o diferido'
};

const CAT_TIPO_COMPROBANTE: Record<string, string> = {
    I: 'I - Ingreso',
    E: 'E - Egreso',
    T: 'T - Traslado',
    N: 'N - Nómina',
    P: 'P - Pago'
};

const CAT_MONEDA: Record<string, string> = {
    MXN: 'MXN - Peso Mexicano',
    USD: 'USD - Dólar americano',
    EUR: 'EUR - Euro'
};

const NumeroALetras = (num: number): string => {
    const Unidades = (n: number) => {
        switch (n) {
            case 1: return 'UN';
            case 2: return 'DOS';
            case 3: return 'TRES';
            case 4: return 'CUATRO';
            case 5: return 'CINCO';
            case 6: return 'SEIS';
            case 7: return 'SIETE';
            case 8: return 'OCHO';
            case 9: return 'NUEVE';
            default: return '';
        }
    };

    const Decenas = (n: number) => {
        const d = Math.floor(n / 10);
        const u = n - (d * 10);

        switch (d) {
            case 1:
                switch (u) {
                    case 0: return 'DIEZ';
                    case 1: return 'ONCE';
                    case 2: return 'DOCE';
                    case 3: return 'TRECE';
                    case 4: return 'CATORCE';
                    case 5: return 'QUINCE';
                    default: return 'DIECI' + Unidades(u);
                }
            case 2:
                switch (u) {
                    case 0: return 'VEINTE';
                    default: return 'VEINTI' + Unidades(u);
                }
            case 3: return u > 0 ? 'TREINTA Y ' + Unidades(u) : 'TREINTA';
            case 4: return u > 0 ? 'CUARENTA Y ' + Unidades(u) : 'CUARENTA';
            case 5: return u > 0 ? 'CINCUENTA Y ' + Unidades(u) : 'CINCUENTA';
            case 6: return u > 0 ? 'SESENTA Y ' + Unidades(u) : 'SESENTA';
            case 7: return u > 0 ? 'SETENTA Y ' + Unidades(u) : 'SETENTA';
            case 8: return u > 0 ? 'OCHENTA Y ' + Unidades(u) : 'OCHENTA';
            case 9: return u > 0 ? 'NOVENTA Y ' + Unidades(u) : 'NOVENTA';
            case 0: return Unidades(u);
            default: return '';
        }
    };

    const Centenas = (n: number) => {
        const c = Math.floor(n / 100);
        const d = n - (c * 100);

        switch (c) {
            case 1: return d > 0 ? 'CIENTO ' + Decenas(d) : 'CIEN';
            case 2: return 'DOSCIENTOS ' + Decenas(d);
            case 3: return 'TRESCIENTOS ' + Decenas(d);
            case 4: return 'CUATROCIENTOS ' + Decenas(d);
            case 5: return 'QUINIENTOS ' + Decenas(d);
            case 6: return 'SEISCIENTOS ' + Decenas(d);
            case 7: return 'SETECIENTOS ' + Decenas(d);
            case 8: return 'OCHOCIENTOS ' + Decenas(d);
            case 9: return 'NOVECIENTOS ' + Decenas(d);
            default: return Decenas(d);
        }
    };

    const Seccion = (n: number, div: number, strS: string, strP: string) => {
        const c = Math.floor(n / div);
        const r = n - (c * div);
        let letras = '';

        if (c > 0) {
            if (c > 1) letras = Centenas(c) + ' ' + strP;
            else letras = strS;
        }

        if (r > 0) letras += '';
        return letras;
    };

    const Miles = (n: number) => {
        const div = 1000;
        const r = n % div;
        const strMiles = Seccion(n, div, 'UN MIL', 'MIL');
        const strCentenas = Centenas(r);
        return strMiles === '' ? strCentenas : strMiles + ' ' + strCentenas;
    };

    const Millones = (n: number) => {
        const div = 1000000;
        const r = n % div;
        const strMillones = Seccion(n, div, 'UN MILLON', 'MILLONES');
        const strMiles = Miles(r);
        return strMillones === '' ? strMiles : strMillones + ' ' + strMiles;
    };

    const data = {
        entero: Math.floor(num),
        centavos: ((Math.round(num * 100)) - (Math.floor(num) * 100))
    };

    const letrasCentavos = data.centavos > 0
        ? data.centavos.toString().padStart(2, '0') + '/100'
        : '00/100';

    if (data.entero === 0) return 'CERO PESOS ' + letrasCentavos;
    return Millones(data.entero) + ' PESOS ' + letrasCentavos;
};

// --- PARSEADOR XML ---
const parseXmlToFactura = (xmlStr: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');

    const getAttr = (tagName: string, attrName: string) => {
        let nodes = xmlDoc.getElementsByTagNameNS('*', tagName);
        if (nodes.length === 0) nodes = xmlDoc.getElementsByTagName(`cfdi:${tagName}`);
        if (nodes.length === 0) nodes = xmlDoc.getElementsByTagName(`tfd:${tagName}`);
        return nodes.length > 0 ? (nodes[0].getAttribute(attrName) || '') : '';
    };

    const conceptosNodes = xmlDoc.getElementsByTagNameNS('*', 'Concepto');
    const conceptos = Array.from(conceptosNodes).map((node: Element) => {
        let ivaTasa = 0.16;
        let ivaBase = parseFloat(node.getAttribute('Importe') || '0');
        let ivaImporte = 0;

        const traslado = node.getElementsByTagNameNS('*', 'Traslado')[0];
        if (traslado && traslado.getAttribute('Impuesto') === '002') {
            ivaTasa = parseFloat(traslado.getAttribute('TasaOCuota') || '0.16');
            if (traslado.hasAttribute('Base')) ivaBase = parseFloat(traslado.getAttribute('Base') || '0');
            if (traslado.hasAttribute('Importe')) ivaImporte = parseFloat(traslado.getAttribute('Importe') || '0');
        }

        return {
            claveProdServ: node.getAttribute('ClaveProdServ') || '',
            cantidad: parseFloat(node.getAttribute('Cantidad') || '0'),
            claveUnidad: node.getAttribute('ClaveUnidad') || '',
            unidad: node.getAttribute('Unidad') || '',
            descripcion: node.getAttribute('Descripcion') || '',
            valorUnitario: parseFloat(node.getAttribute('ValorUnitario') || '0'),
            importe: parseFloat(node.getAttribute('Importe') || '0'),
            objetoImpuesto: node.getAttribute('ObjetoImp') || '02',
            noIdentificacion: node.getAttribute('NoIdentificacion') || '',
            ivaTasa,
            ivaBase,
            ivaImporte
        };
    });

    let iva = 0;
    const impuestosNodes = xmlDoc.getElementsByTagNameNS('*', 'Impuestos');
    for (let i = 0; i < impuestosNodes.length; i++) {
        const total = impuestosNodes[i].getAttribute('TotalImpuestosTrasladados');
        if (total) {
            iva = parseFloat(total);
            break;
        }
    }

    const uuid = getAttr('TimbreFiscalDigital', 'UUID');
    const fechaTimbrado = getAttr('TimbreFiscalDigital', 'FechaTimbrado');
    const rfcPac = getAttr('TimbreFiscalDigital', 'RfcProvCertif');
    const selloCfdi = getAttr('TimbreFiscalDigital', 'SelloCFD');
    const noCertificadoSat = getAttr('TimbreFiscalDigital', 'NoCertificadoSAT');
    const emisorRfc = getAttr('Emisor', 'Rfc');
    const receptorRfc = getAttr('Receptor', 'Rfc');
    const totalStr = getAttr('Comprobante', 'Total') || '0';

    const cadenaOriginal = `||1.1|${uuid}|${fechaTimbrado}|${rfcPac}|${selloCfdi}|${noCertificadoSat}||`;
    const ultimos8Sello = selloCfdi ? selloCfdi.slice(-8) : '';
    const qrUrlString = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${emisorRfc}&rr=${receptorRfc}&tt=${totalStr}&fe=${ultimos8Sello}`;
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrUrlString)}&size=150`;

    const formaPagoKey = getAttr('Comprobante', 'FormaPago');
    const metodoPagoKey = getAttr('Comprobante', 'MetodoPago');
    const tipoCompKey = getAttr('Comprobante', 'TipoDeComprobante');
    const monedaKey = getAttr('Comprobante', 'Moneda');

    return {
        folio: getAttr('Comprobante', 'Folio'),
        serie: getAttr('Comprobante', 'Serie'),
        fecha: getAttr('Comprobante', 'Fecha'),
        estado: 'TIMBRADO',
        uuid,
        selloCfdi,
        selloSat: getAttr('TimbreFiscalDigital', 'SelloSAT'),
        noCertificado: getAttr('Comprobante', 'NoCertificado'),
        noCertificadoSat,
        fechaTimbrado,
        rfcPac,
        cadenaOriginal,
        qrCodeUrl,
        emisor: {
            nombre: getAttr('Emisor', 'Nombre'),
            rfc: emisorRfc,
            regimenFiscal: getAttr('Emisor', 'RegimenFiscal'),
            cp: getAttr('Comprobante', 'LugarExpedicion')
        },
        receptor: {
            nombre: getAttr('Receptor', 'Nombre'),
            rfc: receptorRfc,
            usoCfdi: getAttr('Receptor', 'UsoCFDI'),
            regimenFiscal: getAttr('Receptor', 'RegimenFiscalReceptor'),
            cp: getAttr('Receptor', 'DomicilioFiscalReceptor')
        },
        conceptos,
        subtotal: parseFloat(getAttr('Comprobante', 'SubTotal') || '0'),
        iva,
        total: parseFloat(totalStr),
        totalLetra: NumeroALetras(parseFloat(totalStr)) + ' M.N.',
        moneda: CAT_MONEDA[monedaKey] || monedaKey,
        formaPago: CAT_FORMA_PAGO[formaPagoKey] || formaPagoKey,
        metodoPago: CAT_METODO_PAGO[metodoPagoKey] || metodoPagoKey,
        tipoComprobante: CAT_TIPO_COMPROBANTE[tipoCompKey] || tipoCompKey,
        exportacion: getAttr('Comprobante', 'Exportacion')
    };
};

type SatLoginModalProps = {
    open: boolean;
    loading: boolean;
    onSubmit: (payload: {
        rfc: string;
        password: string;
        cerFile: File | null;
        keyFile: File | null;
    }) => Promise<void>;
};

function SatLoginModal({ open, loading, onSubmit }: SatLoginModalProps) {
    const [rfc, setRfc] = useState('');
    const [password, setPassword] = useState('');
    const [cerFile, setCerFile] = useState<File | null>(null);
    const [keyFile, setKeyFile] = useState<File | null>(null);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!rfc || !password || !cerFile || !keyFile) {
            alert('Debes capturar RFC, contraseña y seleccionar ambos archivos .cer y .key');
            return;
        }

        await onSubmit({ rfc, password, cerFile, keyFile });
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="bg-slate-900 text-white px-6 py-5">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-7 h-7 text-emerald-400" />
                        <div>
                            <h2 className="text-xl font-bold">Conectar con SAT</h2>
                            <p className="text-sm text-slate-300">
                                Inicia sesión con tu e.firma para solicitar y descargar facturas recibidas.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500">RFC</label>
                            <input
                                type="text"
                                value={rfc}
                                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                                placeholder="COMO891216CM1"
                                className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-mono text-slate-700 uppercase"
                            />
                        </div>

                        <label className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-5 text-center hover:border-blue-400 transition-colors cursor-pointer">
                            <UploadCloud className="w-7 h-7 mx-auto text-slate-400 mb-2" />
                            <div className="text-sm font-bold text-slate-700">Subir archivo .CER</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {cerFile ? cerFile.name : 'Selecciona tu certificado'}
                            </div>
                            <input
                                type="file"
                                accept=".cer"
                                className="hidden"
                                onChange={(e) => setCerFile(e.target.files?.[0] || null)}
                            />
                        </label>

                        <label className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-5 text-center hover:border-blue-400 transition-colors cursor-pointer">
                            <UploadCloud className="w-7 h-7 mx-auto text-slate-400 mb-2" />
                            <div className="text-sm font-bold text-slate-700">Subir archivo .KEY</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {keyFile ? keyFile.name : 'Selecciona tu llave privada'}
                            </div>
                            <input
                                type="file"
                                accept=".key"
                                className="hidden"
                                onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                            />
                        </label>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Contraseña de la e.firma</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-medium text-slate-700"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                        Esta sesión SAT se usará para consultar, verificar y descargar CFDI recibidos.
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            Conectar SAT
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function FacturasRecibidasPage() {
    const [facturas, setFacturas] = useState<FacturaRecibida[]>([]);
    const [solicitudes, setSolicitudes] = useState<SolicitudSAT[]>([]);
    const [loading, setLoading] = useState(true);
    const [sincronizando, setSincronizando] = useState(false);
    const [q, setQ] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const ITEMS_POR_PAGINA = 10;
    const [mostrarHistorial, setMostrarHistorial] = useState(false);
    const [mostrarLoginSat, setMostrarLoginSat] = useState(false);
    const [satSesionActiva, setSatSesionActiva] = useState(false);
    const [satRfc, setSatRfc] = useState('');
    const [loginSatCargando, setLoginSatCargando] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const hoy = new Date().toISOString().split('T')[0];
    const haceUnaSemana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [fechaInicio, setFechaInicio] = useState(haceUnaSemana);
    const [fechaFin, setFechaFin] = useState(hoy);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const timestamp = new Date().getTime();

            const resFacturas = await fetch(`/api/facturas-recibidas?t=${timestamp}`);
            const dataFacturas = await resFacturas.json();
            setFacturas(Array.isArray(dataFacturas) ? dataFacturas : []);

            const resSolicitudes = await fetch(`/api/facturas-recibidas/solicitudes?t=${timestamp}`);
            const dataSolicitudes = await resSolicitudes.json();
            setSolicitudes(Array.isArray(dataSolicitudes) ? dataSolicitudes : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const cargarSesionSat = useCallback(async () => {
        try {
            const res = await fetch('/api/facturas-recibidas/sesion', { cache: 'no-store' });
            const data = await res.json();

            setSatSesionActiva(Boolean(data.activa));
            setSatRfc(data.rfc || '');
            setMostrarLoginSat(!data.activa);
        } catch (error) {
            setSatSesionActiva(false);
            setSatRfc('');
            setMostrarLoginSat(true);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => { cargarSesionSat(); }, [cargarSesionSat]);
    useEffect(() => { setPaginaActual(1); }, [q]);

    const handleLoginSat = async ({
        rfc,
        password,
        cerFile,
        keyFile,
    }: {
        rfc: string;
        password: string;
        cerFile: File | null;
        keyFile: File | null;
    }) => {
        setLoginSatCargando(true);

        try {
            const formData = new FormData();
            formData.append('rfc', rfc);
            formData.append('password', password);
            if (cerFile) formData.append('cer', cerFile);
            if (keyFile) formData.append('key', keyFile);

            const res = await fetch('/api/facturas-recibidas/sesion', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`❌ Error SAT: ${data.error}`);
                return;
            }

            setSatSesionActiva(true);
            setSatRfc(data.rfc || rfc);
            setMostrarLoginSat(false);
            alert('✅ Sesión SAT iniciada correctamente.');
        } catch (error) {
            alert('No fue posible iniciar sesión con SAT.');
        } finally {
            setLoginSatCargando(false);
        }
    };

    const handleCerrarSesionSat = async () => {
        try {
            const res = await fetch('/api/facturas-recibidas/sesion', {
                method: 'DELETE',
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`❌ Error: ${data.error || 'No se pudo cerrar la sesión SAT.'}`);
                return;
            }

            setSatSesionActiva(false);
            setSatRfc('');
            setMostrarLoginSat(true);
            alert('✅ Sesión SAT cerrada.');
        } catch (error) {
            alert('No fue posible cerrar la sesión SAT.');
        }
    };

    const handleSincronizar = async () => {
        setSincronizando(true);
        try {
            const res = await fetch('/api/facturas-recibidas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fechaInicio, fechaFin })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`❌ Atención: ${data.error}`);
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

            if (!res.ok) {
                alert(`❌ Error: ${data.error}`);
                return;
            }

            alert(`ℹ️ ${data.mensaje}`);
            cargar();
        } catch (error) {
            alert('Error al comprobar descargas.');
        } finally {
            setSincronizando(false);
        }
    };

    const handleSubirXML = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setSincronizando(true);
        try {
            const file = e.target.files[0];
            const text = await file.text();

            const res = await fetch('/api/facturas-recibidas/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ xmlContenido: text })
            });

            const data = await res.json();

            if (!res.ok) alert(`❌ Error: ${data.error}`);
            else alert(`✅ ${data.mensaje}`);

            cargar();
        } catch (err) {
            alert('Error al leer el archivo XML.');
        } finally {
            setSincronizando(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
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

    const handleDescargarPDF = async (f: FacturaRecibida) => {
        if (!f.xmlContenido) return alert('No hay XML guardado para generar el PDF.');

        try {
            const facturaParseada = parseXmlToFactura(f.xmlContenido);
            const doc = <FacturaPDF factura={facturaParseada} />;
            const asPdf = pdf(doc);
            const blob = await asPdf.toBlob();
            saveAs(blob, `${f.emisorRfc}_${f.uuid}.pdf`);
        } catch (error) {
            console.error(error);
            alert('Error al armar el PDF de esta factura.');
        }
    };

    const handleConsolidado = async () => {
        if (facturas.length === 0) return alert('No hay facturas para consolidar.');

        const zip = new JSZip();
        const folderXML = zip.folder('Gastos_XML');

        facturas.forEach(f => {
            if (f.xmlContenido) folderXML?.file(`${f.emisorRfc}_${f.uuid}.xml`, f.xmlContenido);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'Gastos_Consolidado_XML.zip');
    };

    const fmt = (n: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    const fmtFecha = (d: string) => new Date(d).toLocaleDateString('es-MX');

    const facturasFiltradas = facturas.filter(f => {
        const busqueda = q.toLowerCase();
        return (
            !q ||
            f.emisorNombre.toLowerCase().includes(busqueda) ||
            f.emisorRfc.toLowerCase().includes(busqueda) ||
            f.uuid.toLowerCase().includes(busqueda)
        );
    });

    const totalPaginas = Math.ceil(facturasFiltradas.length / ITEMS_POR_PAGINA);
    const startIndex = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const facturasPaginadas = facturasFiltradas.slice(startIndex, startIndex + ITEMS_POR_PAGINA);

    return (
        <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
            <div className="max-w-7xl mx-auto space-y-6 pb-24">

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold transition-colors">
                            <ArrowLeft className="w-5 h-5" /> Panel
                        </Link>
                        <Inbox className="w-8 h-8 text-pink-600 ml-2" />
                        <h1 className="text-3xl font-bold">Facturas Recibidas</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm ${satSesionActiva
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-sm font-bold">
                                {satSesionActiva ? `SAT conectado${satRfc ? `: ${satRfc}` : ''}` : 'SAT no conectado'}
                            </span>
                        </div>

                        <button
                            onClick={() => setMostrarLoginSat(true)}
                            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-900 transition-all font-bold text-sm shadow-sm"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            {satSesionActiva ? 'Cambiar e.firma' : 'Conectar SAT'}
                        </button>

                        {satSesionActiva && (
                            <button
                                onClick={handleCerrarSesionSat}
                                className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all font-bold text-sm shadow-sm"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar SAT
                            </button>
                        )}

                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-sm text-slate-400 font-bold">De:</span>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                            />
                            <span className="text-sm text-slate-400 font-bold ml-2">A:</span>
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                            />
                        </div>

                        <button
                            onClick={() => setMostrarHistorial(!mostrarHistorial)}
                            className="flex items-center gap-2 bg-white text-slate-600 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all font-bold text-sm shadow-sm"
                        >
                            <Clock className="w-4 h-4" /> Historial
                        </button>

                        <input
                            type="file"
                            accept=".xml"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleSubirXML}
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sincronizando}
                            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-all font-bold text-sm shadow-sm disabled:opacity-50"
                        >
                            <FileCode className="w-4 h-4" /> Subir XML
                        </button>

                        <button
                            onClick={handleConsolidado}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-100"
                        >
                            <Archive className="w-4 h-4" /> Consolidado
                        </button>

                        <button
                            onClick={handleVerificarDescargas}
                            disabled={sincronizando || !satSesionActiva}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all font-bold text-sm shadow-lg shadow-emerald-100 disabled:opacity-50"
                        >
                            {sincronizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Comprobar
                        </button>

                        <button
                            onClick={handleSincronizar}
                            disabled={sincronizando || !satSesionActiva}
                            className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-xl hover:bg-pink-700 transition-all font-bold text-sm shadow-lg shadow-pink-100 disabled:opacity-50"
                        >
                            {sincronizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />}
                            Pedir al SAT
                        </button>
                    </div>
                </div>

                {mostrarHistorial && (
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-lg text-white">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-400" />
                            Historial de Peticiones al SAT
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-slate-400 border-b border-slate-700">
                                    <tr>
                                        <th className="pb-2">Fecha Solicitada</th>
                                        <th className="pb-2">Token (Request ID)</th>
                                        <th className="pb-2">Estado</th>
                                        <th className="pb-2">Mensaje SAT</th>
                                        <th className="pb-2">Creado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {solicitudes.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-4 text-center text-slate-500">
                                                No hay peticiones recientes.
                                            </td>
                                        </tr>
                                    ) : null}

                                    {solicitudes.map(s => (
                                        <tr key={s.id}>
                                            <td className="py-3 font-medium">
                                                {fmtFecha(s.fechaInicio)} - {fmtFecha(s.fechaFin)}
                                            </td>

                                            <td className="py-3 font-mono text-xs text-blue-300 break-all pr-4">
                                                {s.requestId}
                                            </td>

                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${ESTADO_SOLICITUD_STYLES[s.estado] || 'bg-slate-700 text-slate-200'}`}>
                                                    {s.estado}
                                                </span>
                                            </td>

                                            <td className="py-3 text-slate-300 text-xs max-w-md">
                                                {s.mensajeSat || 'Sin mensaje del SAT todavía.'}
                                            </td>

                                            <td className="py-3 text-slate-400">
                                                {new Date(s.createdAt).toLocaleString('es-MX')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

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

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-base text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['Fecha', 'Proveedor / RFC', 'UUID', 'Total', 'Estado', 'Acciones'].map(h => (
                                        <th key={h} className="px-6 py-4 text-sm font-bold uppercase text-slate-500">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : facturasPaginadas.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-500">
                                            No hay facturas recibidas sincronizadas.
                                        </td>
                                    </tr>
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
                                                    <button
                                                        onClick={() => handleDescargarXML(f)}
                                                        title="Descargar XML"
                                                        className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    >
                                                        <FileCode className="w-5 h-5" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDescargarPDF(f)}
                                                        title="Descargar PDF"
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <FileText className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPaginas > 1 && (
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between mt-auto">
                            <span className="text-sm text-slate-500 font-medium">
                                Página {paginaActual} de {totalPaginas}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                                    disabled={paginaActual === 1}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                                    disabled={paginaActual === totalPaginas}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <SatLoginModal
                open={mostrarLoginSat}
                loading={loginSatCargando}
                onSubmit={handleLoginSat}
            />
        </div>
    );
}