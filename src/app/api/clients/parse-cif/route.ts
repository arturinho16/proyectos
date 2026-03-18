import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

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

    // ── Normalizar texto ──────────────────────────────────────────────────────
    // pdf-parse en tablas SAT elimina espacios entre palabras y quita tildes
    // El texto queda como: "Nombre(s):\nOMARARTURO\nPrimerApellido:\nCORONA"
    const text = String(data?.text || '')
      .replace(/\r/g, '')
      .replace(/\|/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n /g, '\n')
      .replace(/\n{3,}/g, '\n\n');

    console.log('📄 Texto CIF raw (3000):\n', text.substring(0, 3000));

    // ── Helper: valor en la línea SIGUIENTE al label ──────────────────────────
    // Necesario porque pdf-parse pone label en una línea y valor en la siguiente
    const getNextLine = (label: string): string => {
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const clean = lines[i].replace(/\s/g, '').toLowerCase();
        const labelClean = label.replace(/\s/g, '').toLowerCase();
        if (clean === labelClean || clean === labelClean + ':') {
          // buscar la siguiente línea no vacía
          for (let j = i + 1; j < lines.length; j++) {
            const next = lines[j].trim();
            if (next) return next;
          }
        }
      }
      return '';
    };

    // ── Helper: mismo renglón después del label ───────────────────────────────
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

    // ── Helper: busca valor ya sea en misma línea o siguiente ─────────────────
    const get = (label: string): string => {
      return getSameLine(label) || getNextLine(label);
    };

    // ── RFC ───────────────────────────────────────────────────────────────────
    const rfc = (
      get('RFC') ||
      (text.match(/\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/) || [])[1] || ''
    ).toUpperCase().trim();

    // ── Nombre / Razón Social ─────────────────────────────────────────────────
    let nombreRazonSocial = '';

    // Persona Moral
    
const razonSocial =
  get('Denominación/Razón Social') ||
  get('Denominacion/Razon Social') ||
  get('DenominaciónRazónSocial') ||
  get('DenominacionRazonSocial');

if (razonSocial && razonSocial.length > 1) {
  nombreRazonSocial = razonSocial.toUpperCase();
} else {
  // ✅ PRIMERO intentar "Nombre Comercial" — viene con espacios correctos
  const nombreComercial =
    get('Nombre Comercial') ||
    get('NombreComercial');

  if (nombreComercial && nombreComercial.length > 3) {
    nombreRazonSocial = nombreComercial.toUpperCase();
  } else {
    // Fallback: concatenar nombre + apellidos línea por línea
    const nombres =
      get('Nombre (s)') ||
      get('Nombre(s)') ||
      get('Nombres');

    const apellido1 =
      get('Primer Apellido') ||
      get('PrimerApellido');

    const apellido2 =
      get('Segundo Apellido') ||
      get('SegundoApellido');

    // Separar palabras pegadas con regex (minúscula→Mayúscula o todo caps seguido)
    const separarPegadas = (s: string) =>
      s.replace(/([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ][a-záéíóúñ])/g, '$1 $2').trim();

    nombreRazonSocial = [nombres, apellido1, apellido2]
      .map(s => separarPegadas((s || '').trim()))
      .filter(Boolean)
      .join(' ')
      .toUpperCase();
  }
}

    // ── Código Postal ─────────────────────────────────────────────────────────
    const cp =
      get('Código Postal') ||
      get('Codigo Postal') ||
      get('CodigoPostal') ||
      get('C.P.') ||
      (text.match(/(?:Código|Codigo|C\.P\.)Postal[:\s]*(\d{5})/) || [])[1] || '';

// ── Domicilio ─────────────────────────────────────────────────────────────
// Usar getSameLine primero para evitar que tome la línea siguiente incorrecta
const calle = (
  getSameLine('NombredeVialidad') ||
  getSameLine('Nombre de Vialidad') ||
  getNextLine('NombredeVialidad') ||
  getNextLine('Nombre de Vialidad')
).replace(/NúmeroExterior.*/i, '').replace(/NumeroExterior.*/i, '').toUpperCase().trim();

const numExteriorRaw =
  getSameLine('NúmeroExterior') ||
  getSameLine('NumeroExterior') ||
  getSameLine('Número Exterior') ||
  getNextLine('NúmeroExterior') ||
  getNextLine('NumeroExterior') ||
  getNextLine('Número Exterior');
const numExterior = (numExteriorRaw || '').split(' ')[0].trim();

const numInterior = (
  getSameLine('NúmeroInterior') ||
  getSameLine('NumeroInterior') ||
  getSameLine('Número Interior') ||
  getNextLine('NúmeroInterior') ||
  getNextLine('NumeroInterior') ||
  getNextLine('Número Interior')
).trim();

// Colonia: si viene vacía en el PDF, dejar vacía (no tomar la siguiente línea)
const coloniaRaw =
  getSameLine('NombredelaColonia') ||
  getSameLine('Nombre de la Colonia');
const colonia = (coloniaRaw || '').toUpperCase().trim();

const municipio = (
  getSameLine('NombredelMunicipiooDemar') ||
  getSameLine('Nombre del Municipio') ||
  getSameLine('NombredelaLocalidad') ||
  getSameLine('Nombre de la Localidad') ||
  getNextLine('NombredelaLocalidad') ||
  getNextLine('Nombre de la Localidad')
).replace(/NombredelMunicipio.*/i, '').toUpperCase().trim();

const estado = (
  getSameLine('NombredelaEntidadFederativa') ||
  getSameLine('Nombre de la Entidad Federativa') ||
  getNextLine('NombredelaEntidadFederativa') ||
  getNextLine('Nombre de la Entidad Federativa')
).replace(/EntreCalle.*/i, '').replace(/Calle:.*/i, '').toUpperCase().trim();
    

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
    // Buscar en texto normalizado sin tildes también
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