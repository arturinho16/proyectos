'use client';
//import Link from 'next/link';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
  FileText,
  PlusCircle,
  Trash2,
  Search,
  X,
  Mail,
  Download,
  Loader2,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { REGIMENES_FISCALES, USOS_CFDI } from '@/lib/sat/catalogos';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Client = {
  id: string;
  nombreRazonSocial: string;
  rfc: string;
  regimenFiscal: string;
  cp: string;
  email?: string;
  usoCfdiDefault?: string;
  calle?: string;
  numExterior?: string;
  numInterior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  pais?: string;
};

type Product = {
  id: string;
  nombre: string;
  descripcion: string;
  claveProdServ: string;
  claveUnidad: string;
  unidad: string;
  precio: number;
  ivaTasa: number;
  iepsTasa: number;
  objetoImpuesto: string;
};

type Concepto = {
  productoId: string;
  descripcion: string;
  claveProdServ: string;
  claveUnidad: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  descuentoPct: number;
  ivaTasa: number;
  iepsTasa: number;
  objetoImpuesto: string;
  noIdentificacion?: string;
};

type FacturaGuardada = {
  id: string;
  serie: string;
  folio: string;
  fecha: string;
  formaPago: string;
  metodoPago: string;
  moneda: string;
  subtotal: number;
  totalIVA: number;
  total: number;
  estado: string;
  uuid?: string;
  usoCFDI?: string;
  client: Client;
  conceptos: Concepto[];
  xmlTimbrado?: string;
  qrCodeUrl?: string;
  selloCfdi?: string;
  selloSat?: string;
  cadenaOriginal?: string;
  noCertificado?: string;
  noCertificadoSat?: string;
  fechaTimbrado?: string;
  rfcPac?: string;
};

type DatosExtraidosXML = {
  uuid?: string;
  fechaTimbrado?: string;
  rfcPac?: string;
  selloCfdi?: string;
  selloSat?: string;
  noCertificadoSat?: string;
  noCertificado?: string;
  cadenaOriginal?: string;
};

// ─── Catálogos y Helpers ──────────────────────────────────────────────────────
const FORMAS_PAGO = [
  { clave: '01', descripcion: 'Efectivo' },
  { clave: '02', descripcion: 'Cheque nominativo' },
  { clave: '03', descripcion: 'Transferencia electrónica de fondos' },
  { clave: '04', descripcion: 'Tarjeta de crédito' },
  { clave: '08', descripcion: 'Vales de despensa' },
  { clave: '28', descripcion: 'Tarjeta de débito' },
  { clave: '99', descripcion: 'Por definir' },
];

const MONEDAS = [
  { clave: 'MXN', descripcion: 'Peso Mexicano' },
  { clave: 'USD', descripcion: 'Dólar Americano' },
  { clave: 'EUR', descripcion: 'Euro' },
];

const EMISOR = {
  nombre: 'OMAR ARTURO CORONA MONROY',
  rfc: 'COMO891216CM1',
  direccion: 'Francisco Clavijero 106 Int. 2, Centro',
  cp: '42000 HIDALGO',
  regimenFiscal: '626 - Régimen Simplificado de Confianza',
  telefono: '7712427953',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(n);

const fmtFecha = (d: string) =>
  new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const fmtFechaHora = (d: string) =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(new Date(d))
    .replace(',', ' -');

const calcularConcepto = (c: Concepto) => {
  const importeBruto = Number(c.cantidad) * Number(c.precioUnitario);
  const descuentoMonto =
    Number(c.descuentoPct) > 0
      ? importeBruto * (Number(c.descuentoPct) / 100)
      : Number(c.descuento) || 0;

  const importe = importeBruto - descuentoMonto;
  const iva =
    c.objetoImpuesto !== '01' ? importe * Number(c.ivaTasa || 0) : 0;
  const ieps =
    c.objetoImpuesto !== '01' ? importe * Number(c.iepsTasa || 0) : 0;

  return { importe, iva, ieps, descuentoMonto };
};

const conceptoVacio = (): Concepto => ({
  productoId: '',
  descripcion: '',
  claveProdServ: '',
  claveUnidad: '',
  unidad: '',
  cantidad: 1,
  precioUnitario: 0,
  descuento: 0,
  descuentoPct: 0,
  ivaTasa: 0.16,
  iepsTasa: 0,
  objetoImpuesto: '02',
  noIdentificacion: '',
});

const getCDMXInfo = () => {
  const d = new Date(
    new Date().toLocaleString('en-US', {
      timeZone: 'America/Mexico_City',
    })
  );

  const pad = (n: number) => String(n).padStart(2, '0');

  const [day, month, year, hours, minutes] = [
    pad(d.getDate()),
    pad(d.getMonth() + 1),
    d.getFullYear(),
    pad(d.getHours()),
    pad(d.getMinutes()),
  ];

  return {
    serieStr: `FAC-${day}${month}${year}-${hours}:${minutes}`,
    fechaStr: `${year}-${month}-${day}T${hours}:${minutes}`,
  };
};

const extraerDatosXML = (xml: string): DatosExtraidosXML => {
  if (!xml || typeof xml !== 'string') return {};

  const getAttr = (name: string) => {
    const match = xml.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
    return match ? match[1] : '';
  };

  const uuid = getAttr('UUID');
  const fechaTimbrado = getAttr('FechaTimbrado');
  const rfcPac = getAttr('RfcProvCertif');
  const selloCfdi = getAttr('SelloCFD') || getAttr('Sello');
  const selloSat = getAttr('SelloSAT');
  const noCertificadoSat = getAttr('NoCertificadoSAT');
  const noCertificado = getAttr('NoCertificado');

  const cadenaOriginal =
    uuid && fechaTimbrado && rfcPac && selloCfdi && noCertificadoSat
      ? `||1.1|${uuid}|${fechaTimbrado}|${rfcPac}|${selloCfdi}|${noCertificadoSat}||`
      : '';

  return {
    uuid,
    fechaTimbrado,
    rfcPac,
    selloCfdi,
    selloSat,
    noCertificadoSat,
    noCertificado,
    cadenaOriginal,
  };
};

const MAP_USO_CFDI = Object.fromEntries(
  USOS_CFDI.map((x) => [x.clave, `${x.clave} - ${x.descripcion}`])
);

const MAP_REGIMEN_FISCAL = Object.fromEntries(
  REGIMENES_FISCALES.map((x) => [x.clave, `${x.clave} - ${x.descripcion}`])
);

const MAP_FORMA_PAGO = Object.fromEntries(
  FORMAS_PAGO.map((x) => [x.clave, `${x.clave} - ${x.descripcion}`])
);

const MAP_METODO_PAGO: Record<string, string> = {
  PUE: 'PUE - Pago en una sola exhibición',
  PPD: 'PPD - Pago en parcialidades o diferido',
};

const MAP_MONEDA = Object.fromEntries(
  MONEDAS.map((x) => [x.clave, `${x.clave} - ${x.descripcion}`])
);

const construirDireccionReceptor = (client?: Partial<Client>) => {
  if (!client) return undefined;

  const partes = [
    client.calle,
    client.numExterior || null,
    client.numInterior ? `Int. ${client.numInterior}` : null,
    client.colonia,
    client.municipio,
    client.estado,
    client.pais || null,
  ].filter(Boolean);

  return partes.length ? partes.join(', ') : undefined;
};

const numeroALetra = (num: number): string => {
  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);

  const unidades = [
    '',
    'UN',
    'DOS',
    'TRES',
    'CUATRO',
    'CINCO',
    'SEIS',
    'SIETE',
    'OCHO',
    'NUEVE',
    'DIEZ',
    'ONCE',
    'DOCE',
    'TRECE',
    'CATORCE',
    'QUINCE',
    'DIECISÉIS',
    'DIECISIETE',
    'DIECIOCHO',
    'DIECINUEVE',
  ];

  const decenas = [
    '',
    '',
    'VEINTE',
    'TREINTA',
    'CUARENTA',
    'CINCUENTA',
    'SESENTA',
    'SETENTA',
    'OCHENTA',
    'NOVENTA',
  ];

  const centenas = [
    '',
    'CIENTO',
    'DOSCIENTOS',
    'TRESCIENTOS',
    'CUATROCIENTOS',
    'QUINIENTOS',
    'SEISCIENTOS',
    'SETECIENTOS',
    'OCHOCIENTOS',
    'NOVECIENTOS',
  ];

  const convertirGrupo = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';

    let r = '';

    if (n >= 100) {
      r += centenas[Math.floor(n / 100)] + ' ';
      n %= 100;
    }

    if (n >= 20) {
      r += decenas[Math.floor(n / 10)];
      if (n % 10 !== 0) r += ' Y ' + unidades[n % 10];
    } else if (n > 0) {
      r += unidades[n];
    }

    return r.trim();
  };

  const convertir = (n: number): string => {
    if (n === 0) return 'CERO';

    let r = '';

    if (n >= 1000000) {
      const m = Math.floor(n / 1000000);
      r += (m === 1 ? 'UN MILLÓN' : `${convertirGrupo(m)} MILLONES`) + ' ';
      n %= 1000000;
    }

    if (n >= 1000) {
      const m = Math.floor(n / 1000);
      r += (m === 1 ? 'MIL' : `${convertirGrupo(m)} MIL`) + ' ';
      n %= 1000;
    }

    r += convertirGrupo(n);
    return r.trim();
  };

  return `${convertir(entero)} PESOS ${centavos
    .toString()
    .padStart(2, '0')}/100 MXN`;
};

const buildFacturaDataPDF = (factura: FacturaGuardada) => {
  const ext = extraerDatosXML(factura.xmlTimbrado || '');

  const usoCfdiClave = factura.usoCFDI || factura.client?.usoCfdiDefault || '';
  const regimenClave = factura.client?.regimenFiscal || '';

  return {
    folio: factura.folio,
    serie: factura.serie,
    fecha: fmtFechaHora(factura.fecha),
    estado: factura.estado,
    uuid: factura.uuid || ext.uuid,
    qrCodeUrl: factura.qrCodeUrl,
    selloCfdi: factura.selloCfdi || ext.selloCfdi,
    selloSat: factura.selloSat || ext.selloSat,
    cadenaOriginal: factura.cadenaOriginal || ext.cadenaOriginal,
    noCertificado: factura.noCertificado || ext.noCertificado,
    noCertificadoSat: factura.noCertificadoSat || ext.noCertificadoSat,
    fechaTimbrado: factura.fechaTimbrado || ext.fechaTimbrado,
    rfcPac: factura.rfcPac || ext.rfcPac,
    emisor: EMISOR,
    receptor: {
      nombre: factura.client?.nombreRazonSocial || 'CLIENTE',
      rfc: factura.client?.rfc || 'XAXX010101000',
      direccion: construirDireccionReceptor(factura.client),
      cp: factura.client?.cp || '',
      usoCfdi: MAP_USO_CFDI[usoCfdiClave] || usoCfdiClave,
      regimenFiscal: MAP_REGIMEN_FISCAL[regimenClave] || regimenClave,
    },
    conceptos: factura.conceptos.map((c) => ({
      claveProdServ: c.claveProdServ || '01010101',
      cantidad: Number(c.cantidad),
      claveUnidad: c.claveUnidad || 'H87',
      unidad: c.unidad || '',
      descripcion: c.descripcion,
      valorUnitario: Number(c.precioUnitario),
      importe: calcularConcepto(c).importe,
      ivaTasa: Number(c.ivaTasa ?? 0.16),
      objetoImpuesto: c.objetoImpuesto,
      noIdentificacion: c.noIdentificacion || '',
    })),
    subtotal: Number(factura.subtotal),
    iva: Number(factura.totalIVA),
    total: Number(factura.total),
    moneda: MAP_MONEDA[factura.moneda] || `${factura.moneda} - Peso Mexicano`,
    formaPago: MAP_FORMA_PAGO[factura.formaPago] || factura.formaPago,
    metodoPago: MAP_METODO_PAGO[factura.metodoPago] || factura.metodoPago,
    totalLetra: numeroALetra(Number(factura.total)),
  };
};

// ─── Componente: Buscador de cliente ──────────────────────────────────────────
function ClienteSearch({
  clients,
  onSelect,
}: {
  clients: Client[];
  onSelect: (c: Client) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered =
    query.length >= 1
      ? clients
        .filter(
          (c) =>
            c.nombreRazonSocial.toLowerCase().includes(query.toLowerCase()) ||
            c.rfc.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8)
      : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por nombre o RFC..."
          className="w-full pl-9 p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setQuery(c.nombreRazonSocial);
                setOpen(false);
                onSelect(c);
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100"
            >
              <div className="font-bold text-sm text-slate-800">
                {c.nombreRazonSocial}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {c.rfc} — CP {c.cp}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal: Vista Previa + Envío ──────────────────────────────────────────────
function ModalVistaPrevia({
  factura,
  onClose,
  onDescargar,
  descargando,
  onTimbrar,
  onNuevaFactura, // 
}: {
  factura: FacturaGuardada;
  onClose: () => void;
  onDescargar: () => void;
  descargando: boolean;
  onTimbrar: (id: string) => Promise<void>;
  onNuevaFactura?: () => void; // 
}) {
  const [correo, setCorreo] = useState(factura.client?.email || '');
  const [enviando, setEnviando] = useState(false);
  const [msgCorreo, setMsgCorreo] = useState('');
  const [timbrando, setTimbrando] = useState(false);
  const correoAutoEnviado = useRef(false);

  const subtotal = factura.conceptos.reduce(
    (acc, c) => acc + calcularConcepto(c).importe,
    0
  );
  const totalIVA = factura.conceptos.reduce(
    (acc, c) => acc + calcularConcepto(c).iva,
    0
  );

  const isTimbrado = factura.estado === 'TIMBRADO';

  const handleTimbrarInterno = async () => {
    setTimbrando(true);
    await onTimbrar(factura.id);
    setTimbrando(false);
  };

  const handleEnviar = async () => {
    if (!correo) return;

    setEnviando(true);
    setMsgCorreo('');

    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { FacturaPDF } = await import('@/lib/pdf/FacturaPDF');

      const facturaData = buildFacturaDataPDF(factura);

      const blob = await pdf(
        React.createElement(FacturaPDF, {
          factura: facturaData,
          logoUrl: '/logo-tufisti.png',
        })
      ).toBlob();

      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];

        const res = await fetch(`/api/facturas/${factura.id}/enviar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinatario: correo,
            pdfBase64: base64,
            xmlContenido: factura.xmlTimbrado || '',
          }),
        });

        const data = await res.json();
        setMsgCorreo(data.ok ? `✅ Enviada a ${correo}` : `❌ ${data.error}`);
        setEnviando(false);
      };
    } catch (err) {
      setMsgCorreo('❌ Error al generar o enviar el PDF');
      setEnviando(false);
    }
  };

  useEffect(() => {
    if (isTimbrado && correo && !correoAutoEnviado.current) {
      correoAutoEnviado.current = true;
      handleEnviar();
    }
  }, [isTimbrado, correo]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-8 border-b border-slate-200">
          <div className="flex items-center gap-5">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${isTimbrado ? 'bg-green-100' : 'bg-blue-100'
                }`}
            >
              <FileText
                className={`w-8 h-8 ${isTimbrado ? 'text-green-600' : 'text-blue-600'
                  }`}
              />
            </div>

            <div>
              {isTimbrado ? (
                <h2 className="text-3xl font-bold text-green-700">
                  🚀 Factura Timbrada
                </h2>
              ) : (
                <h2 className="text-3xl font-bold text-slate-800">
                  📝 Revisar Factura
                </h2>
              )}
              <p className="text-lg text-slate-500 font-mono mt-1">
                {factura.serie}-{factura.folio}{' '}
                <span className="mx-2">•</span> {fmtFecha(factura.fecha)}
              </p>
            </div>
          </div>

          <button
            onClick={isTimbrado && onNuevaFactura ? onNuevaFactura : onClose}
            className="text-slate-400 hover:text-slate-600 p-3 rounded-2xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {isTimbrado && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
              <CheckCircle className="w-8 h-8 text-green-600 shrink-0" />
              <div>
                <h3 className="font-bold text-green-800 text-lg">
                  Timbrado Exitoso en el SAT
                </h3>
                <p className="text-sm text-green-700 font-mono break-all mt-1">
                  {factura.uuid}
                </p>
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <span className="text-xs font-bold uppercase text-slate-500">
                Conceptos
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {factura.conceptos.map((c, i) => {
                const { importe } = calcularConcepto(c);

                return (
                  <div
                    key={i}
                    className="px-5 py-4 flex justify-between items-center text-sm"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        {c.descripcion}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {c.cantidad} × {fmt(c.precioUnitario)} · IVA{' '}
                        {(Number(c.ivaTasa || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-700 text-base">
                      {fmt(importe)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 space-y-2 border border-slate-100 shadow-sm">
            <div className="flex justify-between text-base text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base text-slate-600">
              <span>IVA 16%</span>
              <span className="font-mono text-orange-500">{fmt(totalIVA)}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-blue-900 border-t border-slate-200 pt-3 mt-2">
              <span>Total</span>
              <span className="font-mono">{fmt(Number(factura.total))}</span>
            </div>
          </div>

          {isTimbrado && (
            <div className="border border-purple-100 bg-purple-50 rounded-2xl p-5 space-y-3 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                <span className="text-base font-bold text-purple-900">
                  Enviar por correo
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="flex-1 p-3 border border-purple-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <button
                  onClick={handleEnviar}
                  disabled={enviando || !correo}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" /> Reenviar
                    </>
                  )}
                </button>
              </div>

              {msgCorreo && (
                <p
                  className={`text-sm font-bold ${msgCorreo.startsWith('✅')
                    ? 'text-green-600'
                    : 'text-red-500'
                    }`}
                >
                  {msgCorreo}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4 p-8 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
          {!isTimbrado ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-white border border-slate-300 shadow-sm rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-base transition-all"
              >
                Modificar Factura
              </button>

              <button
                onClick={handleTimbrarInterno}
                disabled={timbrando}
                className="flex-1 py-4 bg-blue-600 text-white shadow-lg shadow-blue-200 rounded-xl hover:bg-blue-700 font-bold text-base transition-all flex justify-center items-center gap-2"
              >
                {timbrando ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" /> Conectando al
                    SAT...
                  </>
                ) : (
                  '🚀 Timbrar Factura'
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onDescargar}
                disabled={descargando}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-slate-300 shadow-sm rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-base disabled:opacity-50 transition-all"
              >
                {descargando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Generando
                    PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" /> Descargar PDF
                  </>
                )}
              </button>

              <button
                onClick={onNuevaFactura || onClose}
                className="flex-1 py-4 bg-blue-600 text-white shadow-lg shadow-blue-200 rounded-xl hover:bg-blue-700 font-bold text-base transition-all"
              >
                Cerrar / Nueva Factura
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
function NuevaFacturaForm() {
  const searchParams = useSearchParams();
  const cotizacionId = searchParams.get('cotizacionId');

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([conceptoVacio()]);
  const [submitting, setSubmitting] = useState(false);
  const [facturaGuardada, setFacturaGuardada] =
    useState<FacturaGuardada | null>(null);
  const [descargando, setDescargando] = useState(false);

  const cdmxInicial = getCDMXInfo();

  const [clienteId, setClienteId] = useState('');
  const [clienteData, setClienteData] = useState<Partial<Client>>({});
  const [usoCFDI, setUsoCFDI] = useState('G03');
  const [formaPago, setFormaPago] = useState('03');
  const [metodoPago, setMetodoPago] = useState('PUE');
  const [moneda, setMoneda] = useState('MXN');
  const [tipoCambio, setTipoCambio] = useState(1);
  const [serie, setSerie] = useState(cdmxInicial.serieStr);
  const [folio, setFolio] = useState('1');
  const [fecha, setFecha] = useState(cdmxInicial.fechaStr);
  const [condicionesPago, setCondicionesPago] = useState('');
  const [notas, setNotas] = useState('');
  const [retencionIVAPct, setRetencionIVAPct] = useState(0);
  const [retencionISRPct, setRetencionISRPct] = useState(0);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []));

    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (metodoPago === 'PPD') setFormaPago('99');
  }, [metodoPago]);

  const handleClienteSelect = (c: Client) => {
    setClienteId(c.id);
    setClienteData(c);
    setUsoCFDI(c.usoCfdiDefault || 'G03');
  };

  const handleProductoChange = (index: number, productoId: string) => {
    const p = products.find((p) => p.id === productoId);
    if (!p) return;

    const updated = [...conceptos];
    updated[index] = {
      ...updated[index],
      productoId: p.id,
      descripcion: p.descripcion || p.nombre,
      claveProdServ: p.claveProdServ,
      claveUnidad: p.claveUnidad,
      unidad: p.unidad,
      precioUnitario: Number(p.precio),
      ivaTasa: Number(p.ivaTasa),
      iepsTasa: Number(p.iepsTasa) || 0,
      objetoImpuesto: p.objetoImpuesto || '02',
    };

    setConceptos(updated);
  };

  const handleConceptoField = (
    index: number,
    field: keyof Concepto,
    value: any
  ) => {
    const updated = [...conceptos];
    (updated[index] as any)[field] = value;

    if (field === 'descuentoPct' && value > 0) updated[index].descuento = 0;
    if (field === 'descuento' && value > 0) updated[index].descuentoPct = 0;

    setConceptos(updated);
  };

  const agregarConcepto = () => setConceptos([...conceptos, conceptoVacio()]);
  const eliminarConcepto = (i: number) =>
    setConceptos(conceptos.filter((_, idx) => idx !== i));

  const subtotal = conceptos.reduce(
    (acc, c) => acc + calcularConcepto(c).importe,
    0
  );
  const totalDescuentos = conceptos.reduce(
    (acc, c) => acc + calcularConcepto(c).descuentoMonto,
    0
  );
  const totalIVA = conceptos.reduce(
    (acc, c) => acc + calcularConcepto(c).iva,
    0
  );
  const totalIEPS = conceptos.reduce(
    (acc, c) => acc + calcularConcepto(c).ieps,
    0
  );

  const retencionIVA = subtotal * (retencionIVAPct / 100);
  const retencionISR = subtotal * (retencionISRPct / 100);
  const total = subtotal + totalIVA + totalIEPS - retencionIVA - retencionISR;

  const resetForm = (nuevoFolio: string) => {
    const nuevaInfoCDMX = getCDMXInfo();

    setClienteId('');
    setClienteData({});
    setUsoCFDI('G03');
    setFormaPago('03');
    setMetodoPago('PUE');
    setMoneda('MXN');
    setTipoCambio(1);
    setSerie(nuevaInfoCDMX.serieStr);
    setFolio(nuevoFolio);
    setFecha(nuevaInfoCDMX.fechaStr);
    setCondicionesPago('');
    setNotas('');
    setRetencionIVAPct(0);
    setRetencionISRPct(0);
    setConceptos([conceptoVacio()]);
  };

  const handleDescargarModal = async () => {
    if (!facturaGuardada) return;

    setDescargando(true);

    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { FacturaPDF } = await import('@/lib/pdf/FacturaPDF');

      const facturaData = buildFacturaDataPDF(facturaGuardada);

      const blob = await pdf(
        React.createElement(FacturaPDF, {
          factura: facturaData,
          logoUrl: '/logo-tufisti.png',
        })
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura-${facturaGuardada.serie}${facturaGuardada.folio}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('❌ Error al generar el PDF');
    } finally {
      setDescargando(false);
    }
  };

  const handleRevisar = async () => {
    if (!clienteId) return alert('Selecciona un cliente');
    if (conceptos.some((c) => !c.productoId)) {
      return alert('Todos los conceptos deben tener un producto');
    }
    if (conceptos.some((c) => !c.descripcion?.trim())) {
      return alert('Todos los conceptos deben tener descripción');
    }

    setSubmitting(true);

    const payload = {
      serie,
      folio,
      fecha,
      formaPago,
      metodoPago,
      moneda,
      tipoCambio,
      condicionesPago,
      notas,
      clienteId,
      usoCFDI,
      retencionIVAPct,
      retencionISRPct,
      cotizacionId: cotizacionId || undefined,
      conceptos: conceptos.map((c) => ({
        ...c,
        descuento: Number(calcularConcepto(c).descuentoMonto) || 0,
      })),
    };

    try {
      const resGuardar = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resGuardar.ok) {
        alert('❌ No se pudo guardar el borrador');
        setSubmitting(false);
        return;
      }

      const dataFactura = await resGuardar.json();

      setFacturaGuardada({
        id: dataFactura.id,
        serie: dataFactura.serie ?? serie,
        folio: dataFactura.folio ?? folio,
        fecha: dataFactura.fecha ?? fecha,
        formaPago: dataFactura.formaPago ?? formaPago,
        metodoPago: dataFactura.metodoPago ?? metodoPago,
        moneda: dataFactura.moneda ?? moneda,
        subtotal: dataFactura.subtotal ?? subtotal,
        totalIVA: dataFactura.totalIVA ?? totalIVA,
        total: dataFactura.total ?? total,
        estado: dataFactura.estado ?? 'BORRADOR',
        uuid: dataFactura.uuid,
        usoCFDI: dataFactura.usoCFDI ?? usoCFDI,
        client: (dataFactura.client || clienteData) as Client,
        conceptos: dataFactura.conceptos ?? conceptos,
        xmlTimbrado: dataFactura.xmlTimbrado ?? '',
      });

      //resetForm(String(parseInt(folio) + 1));
    } catch (error) {
      alert('❌ Ocurrió un error inesperado al guardar.');
    }

    setSubmitting(false);
  };

  const handleTimbrarDesdeModal = async (idFactura: string) => {
    try {
      const resTimbrar = await fetch(`/api/facturas/${idFactura}/timbrar`, {
        method: 'POST',
      });

      const dataTimbrar = await resTimbrar.json();

      if (!resTimbrar.ok) {
        alert(
          `⚠️ Falló el timbrado en el SAT: ${dataTimbrar.error || 'Error desconocido'
          }`
        );
        return;
      }

      const xmlCrudo =
        dataTimbrar.xmlTimbrado ||
        dataTimbrar.xml ||
        dataTimbrar.factura?.xmlTimbrado ||
        dataTimbrar.factura?.xml ||
        '';

      const ext = extraerDatosXML(xmlCrudo);
      const uuidFinal = ext.uuid || dataTimbrar.uuid || dataTimbrar.factura?.uuid;

      if (!uuidFinal) {
        alert(
          '⚠️ Factura timbrada, pero el servidor no devolvió los datos completos del SAT.'
        );

        setFacturaGuardada((prev) =>
          prev
            ? {
              ...prev,
              estado: 'TIMBRADO',
            }
            : null
        );
        return;
      }

      let qrCodeUrl = '';

      try {
        const totalStr = Number(facturaGuardada?.total || 0).toFixed(6);
        const sello8 = ext.selloCfdi ? ext.selloCfdi.slice(-8) : '';
        const rr = facturaGuardada?.client?.rfc || '';

        const qrUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuidFinal}&re=${EMISOR.rfc}&rr=${rr}&tt=${totalStr}&fe=${sello8}`;

        qrCodeUrl = await QRCode.toDataURL(qrUrl, { margin: 1 });
      } catch (e) {
        console.error('Error generando QR', e);
      }

      setFacturaGuardada((prev) =>
        prev
          ? {
            ...prev,
            estado: dataTimbrar.factura?.estado ?? 'TIMBRADO',
            uuid: uuidFinal,
            usoCFDI: dataTimbrar.factura?.usoCFDI ?? prev.usoCFDI,
            client: dataTimbrar.factura?.client ?? prev.client,
            conceptos: dataTimbrar.factura?.conceptos ?? prev.conceptos,
            xmlTimbrado: xmlCrudo,
            qrCodeUrl,
            selloCfdi: ext.selloCfdi,
            selloSat: ext.selloSat,
            cadenaOriginal: ext.cadenaOriginal,
            noCertificado: ext.noCertificado,
            noCertificadoSat:
              ext.noCertificadoSat || dataTimbrar.noCertificadoSAT,
            fechaTimbrado: ext.fechaTimbrado,
            rfcPac: ext.rfcPac,
          }
          : null
      );
    } catch (error) {
      alert('❌ Ocurrió un error de red al intentar timbrar.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {facturaGuardada && (
        <ModalVistaPrevia
          factura={facturaGuardada}
          onClose={() => setFacturaGuardada(null)}
          onNuevaFactura={() => {
            setFacturaGuardada(null);
            resetForm(String(parseInt(folio) + 1));
          }}
          onDescargar={handleDescargarModal}
          descargando={descargando}
          onTimbrar={handleTimbrarDesdeModal}
        />
      )}

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Panel
        </Link>
        <FileText className="w-7 h-7 text-blue-600 ml-1" />
        <h1 className="text-2xl sm:text-3xl font-bold">Nueva Factura</h1>

        {/* NUEVO BOTÓN DE FACTURAS */}
        <       Link
          href="/facturas"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium text-sm transition-colors shadow-sm"
        >     Facturas Creadas
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold uppercase text-slate-400 mb-4">
          Encabezado
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">
              Serie
            </label>
            <input
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">
              Folio
            </label>
            <input
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none"
            />
          </div>

          <div className="space-y-1 col-span-2">
            <label className="text-xs font-bold uppercase text-slate-500">
              Fecha y Hora
            </label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">
              Método de Pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none"
            >
              <option value="PUE">PUE - Una sola exhibición</option>
              <option value="PPD">PPD - Parcialidades o diferido</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">
              Forma de Pago
            </label>
            <select
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
              disabled={metodoPago === 'PPD'}
              className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none disabled:opacity-50"
            >
              {FORMAS_PAGO.map((f) => (
                <option key={f.clave} value={f.clave}>
                  {f.clave} - {f.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">
              Moneda
            </label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none"
            >
              {MONEDAS.map((m) => (
                <option key={m.clave} value={m.clave}>
                  {m.clave} - {m.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">
              Tipo de Cambio
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={tipoCambio}
              onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 1)}
              disabled={moneda === 'MXN'}
              className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold uppercase text-slate-400 mb-4">
          Receptor
        </h2>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500">
              Buscar Cliente
            </label>
            <ClienteSearch clients={clients} onSelect={handleClienteSelect} />
          </div>

          {clienteData.rfc && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-blue-600">
                  RFC
                </label>
                <div className="p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-mono">
                  {clienteData.rfc}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-blue-600">
                  Código Postal
                </label>
                <div className="p-2.5 bg-white border border-blue-200 rounded-xl text-sm font-mono">
                  {clienteData.cp}
                </div>
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold uppercase text-blue-600">
                  Régimen Fiscal
                </label>
                <div className="p-2.5 bg-white border border-blue-200 rounded-xl text-sm">
                  {clienteData.regimenFiscal}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase text-slate-400">
            Conceptos
          </h2>
          <button
            onClick={agregarConcepto}
            className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Agregar Concepto
          </button>
        </div>

        <div className="space-y-4">
          {conceptos.map((c, i) => {
            const { importe, iva } = calcularConcepto(c);

            return (
              <div
                key={i}
                className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Producto / Servicio
                    </label>
                    <select
                      value={c.productoId}
                      onChange={(e) =>
                        handleProductoChange(i, e.target.value)
                      }
                      className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Selecciona un producto —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={c.cantidad}
                      onChange={(e) =>
                        handleConceptoField(
                          i,
                          'cantidad',
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Precio Unitario
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.000001"
                        value={c.precioUnitario}
                        onChange={(e) =>
                          handleConceptoField(
                            i,
                            'precioUnitario',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full p-2.5 pl-6 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {c.productoId && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Descripción{' '}
                      <span className="text-slate-400 font-normal normal-case">
                        (editable — aparece en el CFDI)
                      </span>
                    </label>
                    <input
                      value={c.descripcion}
                      onChange={(e) =>
                        handleConceptoField(i, 'descripcion', e.target.value)
                      }
                      className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                )}

                {c.productoId && (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 border-t border-slate-200">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-400">
                        Clave SAT
                      </label>
                      <div className="text-xs font-mono bg-slate-100 p-2 rounded-lg">
                        {c.claveProdServ}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-400">
                        Unidad
                      </label>
                      <div className="text-xs font-mono bg-slate-100 p-2 rounded-lg">
                        {c.claveUnidad} - {c.unidad}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-400">
                        Desc. $
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={c.descuento}
                        onChange={(e) =>
                          handleConceptoField(
                            i,
                            'descuento',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full p-2 border rounded-lg bg-white outline-none text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-400">
                        Desc. %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={c.descuentoPct}
                        onChange={(e) =>
                          handleConceptoField(
                            i,
                            'descuentoPct',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full p-2 border rounded-lg bg-white outline-none text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-400">
                        IVA
                      </label>
                      <div className="text-xs font-mono bg-orange-50 text-orange-600 p-2 rounded-lg">
                        ${iva.toFixed(2)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-400">
                        Importe
                      </label>
                      <div className="text-xs font-mono bg-green-50 text-green-700 font-bold p-2 rounded-lg">
                        ${importe.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {conceptos.length > 1 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => eliminarConcepto(i)}
                      className="text-red-400 hover:text-red-600 flex items-center gap-1 text-xs"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar concepto
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold uppercase text-slate-400 mb-4">
          Retenciones e Impuestos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">
                  Retención IVA %
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={retencionIVAPct}
                  onChange={(e) =>
                    setRetencionIVAPct(parseFloat(e.target.value) || 0)
                  }
                  className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">
                  Retención ISR %
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={retencionISRPct}
                  onChange={(e) =>
                    setRetencionISRPct(parseFloat(e.target.value) || 0)
                  }
                  className="w-full p-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Ej: Honorarios → IVA 10.67%, ISR 10%
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200">
            {totalDescuentos > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Descuentos</span>
                <span className="font-mono text-red-400">
                  -${totalDescuentos.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>

            {totalIEPS > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>IEPS</span>
                <span className="font-mono text-orange-500">
                  ${totalIEPS.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm text-slate-600">
              <span>IVA Trasladado</span>
              <span className="font-mono text-orange-500">
                ${totalIVA.toFixed(2)}
              </span>
            </div>

            {retencionIVA > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>(-) Retención IVA</span>
                <span className="font-mono">-${retencionIVA.toFixed(2)}</span>
              </div>
            )}

            {retencionISR > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>(-) Retención ISR</span>
                <span className="font-mono">-${retencionISR.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-lg font-bold text-blue-900 border-t pt-2 mt-2">
              <span>Total {moneda !== 'MXN' ? moneda : ''}</span>
              <span className="font-mono">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-10">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all"
        >
          Cancelar
        </button>

        <button
          onClick={handleRevisar}
          disabled={submitting}
          className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
            </>
          ) : (
            '📝 Revisar Factura'
          )}
        </button>
      </div>
    </div>
  );
}

export default function NuevaFacturaPage() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        }
      >
        <NuevaFacturaForm />
      </Suspense>
    </div>
  );
}