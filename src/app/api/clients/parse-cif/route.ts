import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ── Word segmentation para calles sin espacios ────────────────────────────────
const PALABRAS_CALLE = new Set([
  'FRANCISCO', 'CLAVIJERO', 'BENITO', 'JUAREZ', 'HIDALGO', 'MORELOS', 'ZAPATA',
  'MADERO', 'ALLENDE', 'ALDAMA', 'ABASOLO', 'GUERRERO', 'VICTORIA', 'ITURBIDE',
  'REFORMA', 'REVOLUCION', 'INDEPENDENCIA', 'CONSTITUCION', 'LIBERTAD', 'UNION',
  'MEXICO', 'NACIONAL', 'FEDERAL', 'CENTRAL', 'NORTE', 'SUR', 'ORIENTE', 'PONIENTE',
  'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SEPTIMA', 'OCTAVA',
  'NOVENA', 'DECIMA', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'MIGUEL', 'ANGEL', 'JOSE', 'MARIA', 'JUAN', 'PEDRO', 'PABLO', 'LUIS', 'CARLOS',
  'ANTONIO', 'MANUEL', 'RAFAEL', 'GABRIEL', 'IGNACIO', 'AGUSTIN', 'VICENTE',
  'LAZARO', 'CARDENAS', 'OBREGON', 'CALLES', 'DIAZ', 'LOPEZ', 'MATEOS', 'ECHEVERRIA',
  'PORTILLO', 'SALINAS', 'ZEDILLO', 'FOX', 'CALDERON', 'PEÑA', 'NIETO',
  'SIMON', 'BOLIVAR', 'WASHINGTON', 'LINCOLN', 'KENNEDY', 'ROOSEVELT',
  'MELCHOR', 'OCAMPO', 'CAMPO', 'HERRERA', 'MACLOVIO', 'CORONA', 'MONROY',
  'AVENIDA', 'BOULEVARD', 'CALZADA', 'PRIVADA', 'ANDADOR', 'CERRADA', 'CIRCUITO',
  'PASEO', 'PROLONGACION', 'RETORNO', 'VIADUCTO', 'PERIFERICO', 'ANILLO',
  'REAL', 'NUEVO', 'NUEVA', 'GRAN', 'GRANDE', 'ALTO', 'BAJA', 'BELLA', 'BELLO',
  'LOMAS', 'COLINAS', 'JARDINES', 'BOSQUES', 'PRADOS', 'VALLES', 'RINCON',
  'SAN', 'SANTA', 'SANTO', 'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y',
  'PACHUCA', 'SOTO', 'TULANCINGO', 'TULA', 'ACTOPAN', 'IXMIQUILPAN', 'APAN',
  'GUADALAJARA', 'MONTERREY', 'PUEBLA', 'OAXACA', 'MERIDA', 'TIJUANA', 'LEON',
  'QUERETARO', 'AGUASCALIENTES', 'HERMOSILLO', 'CULIACAN', 'DURANGO', 'TOLUCA',
  'CUERNAVACA', 'XALAPA', 'VILLAHERMOSA', 'TUXTLA', 'CAMPECHE', 'CHETUMAL',
  'TEPIC', 'COLIMA', 'CHILPANCINGO', 'TLAXCALA', 'ZACATECAS', 'GUANAJUATO',
  'POTOSI', 'SALTILLO', 'CHIHUAHUA', 'MORELIA', 'JALAPA', 'INSURGENTES',
  'JUAREZ', 'HIDALGO', 'GUERRERO', 'ALDAMA', 'ALLENDE', 'ABASOLO', 'BRAVO',
  'DEGOLLADO', 'MOCTEZUMA', 'CUAUHTEMOC', 'TLAPALERIA', 'FERROCARRIL',
  'INDUSTRIA', 'COMERCIO', 'TRABAJO', 'PROGRESO', 'ESPERANZA', 'PAZ', 'AMOR',
  'ROBLE', 'CEDRO', 'PINO', 'OLMO', 'FRESNO', 'SAUCE', 'NOGAL', 'ENCINO',
  'ROSA', 'CLAVEL', 'JAZMIN', 'LIRIO', 'VIOLETA', 'AZALEA', 'BEGONIA',
  'AGUILA', 'CONDOR', 'PALOMA', 'GOLONDRINA', 'CANARIO', 'JILGUERO',
]);

function separarPalabras(texto: string): string {
  if (!texto || texto.includes(' ')) return texto;

  const n = texto.length;
  const dp: (string[] | null)[] = new Array(n + 1).fill(null);
  dp[0] = [];

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] !== null) {
        const palabra = texto.slice(j, i);
        if (PALABRAS_CALLE.has(palabra)) {
          if (dp[i] === null || dp[i]!.length > dp[j]!.length + 1) {
            dp[i] = [...dp[j]!, palabra];
          }
        }
      }
    }
  }

  if (dp[n] !== null) return dp[n]!.join(' ');

  // Segmentación parcial: separar lo que se pueda desde el inicio
  let mejorFin = 0;
  let mejorPalabras: string[] = [];
  for (let i = n; i >= 1; i--) {
    if (dp[i] !== null) {
      mejorFin = i;
      mejorPalabras = dp[i]!;
      break;
    }
  }

  if (mejorFin > 0 && mejorFin < n) {
    return [...mejorPalabras, texto.slice(mejorFin)].join(' ');
  }

  return texto;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('cif') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo CIF' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(buffer);

    const text = String(data?.text || '')
      .replace(/\r/g, '')
      .replace(/\|/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n /g, '\n')
      .replace(/\n{3,}/g, '\n\n');

    console.log('📄 Texto CIF raw (3000):\n', text.substring(0, 3000));

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getNextLine = (label: string): string => {
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const clean = lines[i].replace(/\s/g, '').toLowerCase();
        const labelClean = label.replace(/\s/g, '').toLowerCase();
        if (clean === labelClean || clean === labelClean + ':') {
          for (let j = i + 1; j < lines.length; j++) {
            const next = lines[j].trim();
            if (next) return next;
          }
        }
      }
      return '';
    };

    const getSameLine = (label: string): string => {
      const labelClean = label.replace(/\s/g, '').toLowerCase();
      const lines = text.split('\n');
      for (const line of lines) {
        const lineClean = line.replace(/\s/g, '').toLowerCase();
        if (lineClean.startsWith(labelClean + ':')) {
          return line.slice(line.indexOf(':') + 1).trim();
        }
      }
      return '';
    };

    const get = (label: string): string => getSameLine(label) || getNextLine(label);

    // ── RFC ───────────────────────────────────────────────────────────────────
    const rfc = (
      get('RFC') ||
      (text.match(/\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/) || [])[1] || ''
    ).toUpperCase().trim();

    // ── Nombre / Razón Social ─────────────────────────────────────────────────
    let nombreRazonSocial = '';

    const razonSocial =
      get('Denominación/Razón Social') ||
      get('Denominacion/Razon Social') ||
      get('DenominaciónRazónSocial') ||
      get('DenominacionRazonSocial');

    if (razonSocial && razonSocial.length > 1) {
      nombreRazonSocial = razonSocial.toUpperCase();
    } else {
      // PRIMERO: encabezado visual de la CIF (tiene espacios correctos)
      const encabezadoMatch =
        text.match(/Registro Federal de Contribuyentes\s*\n([\s\S]*?)\nNombre,/i);
      if (encabezadoMatch) {
        nombreRazonSocial = encabezadoMatch[1]
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .join(' ')
          .toUpperCase();
      }

      if (!nombreRazonSocial) {
        const nombres = get('Nombre (s)') || get('Nombre(s)') || get('Nombres');
        const apellido1 = get('Primer Apellido') || get('PrimerApellido');
        const apellido2 = get('Segundo Apellido') || get('SegundoApellido');
        if (nombres || apellido1) {
          nombreRazonSocial = [nombres, apellido1, apellido2]
            .map((s: string) => (s || '').trim())
            .filter(Boolean)
            .join(' ')
            .toUpperCase();
        }
      }

      if (!nombreRazonSocial) {
        const nombreComercial = get('Nombre Comercial') || get('NombreComercial');
        if (nombreComercial && nombreComercial.length > 3) {
          nombreRazonSocial = nombreComercial.toUpperCase();
        }
      }
    }

    // ── Código Postal ─────────────────────────────────────────────────────────
    const cp =
      get('Código Postal') ||
      get('Codigo Postal') ||
      get('CodigoPostal') ||
      get('C.P.') ||
      (text.match(/(?:Código|Codigo|C\.P\.)Postal[:\s]*(\d{5})/) || [])[1] || '';

    // ── Calle ─────────────────────────────────────────────────────────────────
    // Extraer valor crudo del bloque comprimido con lookahead
    const calleMatch =
      text.match(/NombredeVialidad[:\s]*(.*?)(?=N[uú]meroExterior|$)/im) ||
      text.match(/Nombre\s*de\s*Vialidad[:\s]*(.*?)(?=N[uú]mero\s*Exterior|$)/im);
    const calleRaw = (calleMatch?.[1]?.trim() || '').toUpperCase().trim();

    // ✅ Aplicar word segmentation si viene sin espacios (igual que el nombre)
    const calle = separarPalabras(calleRaw);

    // ── Número Exterior ───────────────────────────────────────────────────────
    const numExteriorMatch =
      text.match(/N[uú]meroExterior[:\s]*([^\sN\n][^\s\n]*)/i) ||
      text.match(/N[uú]mero\s*Exterior[:\s]*([^\s\n]+)/i);
    const numExteriorRaw =
      numExteriorMatch?.[1]?.trim() ||
      getSameLine('NúmeroExterior') ||
      getSameLine('NumeroExterior') ||
      getSameLine('Número Exterior') ||
      getNextLine('NúmeroExterior') ||
      getNextLine('NumeroExterior') ||
      getNextLine('Número Exterior');
    const numExterior = (numExteriorRaw || '').split(/\s/)[0].trim();

    // ── Número Interior ───────────────────────────────────────────────────────
    const numInterior = (
      getSameLine('NúmeroInterior') ||
      getSameLine('NumeroInterior') ||
      getSameLine('Número Interior') ||
      getNextLine('NúmeroInterior') ||
      getNextLine('NumeroInterior') ||
      getNextLine('Número Interior')
    ).trim();

    // ── Colonia ───────────────────────────────────────────────────────────────
    const coloniaRaw =
      getSameLine('NombredelaColonia') ||
      getSameLine('Nombre de la Colonia');
    const colonia = (coloniaRaw || '').toUpperCase().trim();

    // ── Municipio ─────────────────────────────────────────────────────────────
    // Primero buscar en encabezado visual: "PACHUCA DE SOTO , HIDALGO"
    const encabezadoLugar = text.match(
      /Lugar y Fecha de Emisión\s*\n([^\n]+)/i
    );
    const municipioDesdeEncabezado = encabezadoLugar
      ? (encabezadoLugar[1].split(',')[0] || '').trim().toUpperCase()
      : '';

    // Fallback: bloque comprimido partido en 2 líneas
    const municipioLineMatch = text.match(
      /NombredelMunicipio[^:\n]*[:\s]*([^\n]+)\n([^\n]+?)(?=\nNombre|\n\n|$)/i
    );
    const municipioComprimido = municipioLineMatch
      ? (municipioLineMatch[1].trim() + ' ' + municipioLineMatch[2].trim()).trim()
      : (
        getSameLine('NombredelMunicipiooDemar') ||
        getSameLine('Nombre del Municipio') ||
        getSameLine('NombredelaLocalidad') ||
        getSameLine('Nombre de la Localidad') ||
        getNextLine('NombredelaLocalidad') ||
        getNextLine('Nombre de la Localidad')
      );

    const municipioRaw = municipioDesdeEncabezado || municipioComprimido;
    const municipio = municipioRaw
      .replace(/NombredelMunicipio.*/i, '')
      .toUpperCase()
      .trim();

    // ── Estado ────────────────────────────────────────────────────────────────
    // Encabezado visual: "PACHUCA DE SOTO , HIDALGO A 30 DE OCTUBRE"
    const estadoDesdeEncabezado = encabezadoLugar
      ? ((encabezadoLugar[1].split(',')[1] || '').trim().split(' ')[0] || '').toUpperCase()
      : '';

    const estadoComprimidoRaw =
      getSameLine('NombredelaEntidadFederativa') ||
      getSameLine('Nombre de la Entidad Federativa') ||
      getNextLine('NombredelaEntidadFederativa') ||
      getNextLine('Nombre de la Entidad Federativa') ||
      (text.match(/NombredelaEntidadFederativa[:\s]*([A-ZÁÉÍÓÚÑ]+)/i))?.[1] || '';

    const estadoRaw = estadoDesdeEncabezado || estadoComprimidoRaw;
    const estado = estadoRaw
      .replace(/EntreCalle.*/i, '')
      .replace(/Entre\s+Calle.*/i, '')
      .replace(/Calle:.*/i, '')
      .toUpperCase()
      .trim();

    // ── Régimen Fiscal ────────────────────────────────────────────────────────
    const REGIMEN_MAP: Record<string, string> = {
      'General de Ley Personas Morales': '601',
      'Personas Morales con Fines no Lucrativos': '603',
      'Sueldos y Salarios e Ingresos Asimilados': '605',
      'Arrendamiento': '606',
      'Actividades Empresariales y Profesionales': '612',
      'Incorporación Fiscal': '621',
      'Regimen de Incorporacion Fiscal': '621',
      'Régimen Simplificado de Confianza': '626',
      'Sin obligaciones fiscales': '616',
      'Residentes en el Extranjero': '610',
    };

    let regimenFiscal = '';
    const textNorm = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [desc, clave] of Object.entries(REGIMEN_MAP)) {
      const descNorm = desc.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (text.includes(desc) || textNorm.includes(descNorm)) {
        regimenFiscal = clave;
        break;
      }
    }

    // ── Resultado ─────────────────────────────────────────────────────────────
    const result = {
      rfc,
      nombreRazonSocial,
      regimenFiscal,
      cp,
      calle,
      numExterior,
      numInterior,
      colonia,
      municipio,
      estado,
      pais: 'MEXICO',
    };

    console.log('✅ CIF parseada:', result);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Error parseando CIF:', error);
    return NextResponse.json({ error: 'No se pudo leer la CIF' }, { status: 500 });
  }
}