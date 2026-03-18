// Catálogo oficial SAT - Régimen Fiscal (cat_RegimenFiscal)
export const REGIMENES_FISCALES = [
  { clave: '601', descripcion: '601 - General de Ley Personas Morales' },
  { clave: '603', descripcion: '603 - Personas Morales con Fines no Lucrativos' },
  { clave: '605', descripcion: '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { clave: '606', descripcion: '606 - Arrendamiento' },
  { clave: '607', descripcion: '607 - Régimen de Enajenación o Adquisición de Bienes' },
  { clave: '608', descripcion: '608 - Demás ingresos' },
  { clave: '610', descripcion: '610 - Residentes en el Extranjero sin Establecimiento Permanente en México' },
  { clave: '611', descripcion: '611 - Ingresos por Dividendos (socios y accionistas)' },
  { clave: '612', descripcion: '612 - Personas Físicas con Actividades Empresariales y Profesionales' },
  { clave: '614', descripcion: '614 - Ingresos por intereses' },
  { clave: '615', descripcion: '615 - Régimen de los ingresos por obtención de premios' },
  { clave: '616', descripcion: '616 - Sin obligaciones fiscales' },
  { clave: '620', descripcion: '620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
  { clave: '621', descripcion: '621 - Incorporación Fiscal' },
  { clave: '622', descripcion: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { clave: '623', descripcion: '623 - Opcional para Grupos de Sociedades' },
  { clave: '624', descripcion: '624 - Coordinados' },
  { clave: '625', descripcion: '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { clave: '626', descripcion: '626 - Régimen Simplificado de Confianza' },
];

// Catálogo oficial SAT - Uso de CFDI (cat_UsoCFDI)
export const USOS_CFDI = [
  // ⭐ Más comunes (aparecen primero)
  { clave: 'G03', descripcion: 'G03 - Gastos en general', tipo: 'comun' },
  { clave: 'G01', descripcion: 'G01 - Adquisición de mercancías', tipo: 'comun' },
  { clave: 'G02', descripcion: 'G02 - Devoluciones, descuentos o bonificaciones', tipo: 'comun' },
  { clave: 'CP01', descripcion: 'CP01 - Pagos', tipo: 'comun' },
  { clave: 'S01', descripcion: 'S01 - Sin efectos fiscales', tipo: 'comun' },
  // Inversiones
  { clave: 'I01', descripcion: 'I01 - Construcciones', tipo: 'inversion' },
  { clave: 'I02', descripcion: 'I02 - Mobiliario y equipo de oficina por inversiones', tipo: 'inversion' },
  { clave: 'I03', descripcion: 'I03 - Equipo de transporte', tipo: 'inversion' },
  { clave: 'I04', descripcion: 'I04 - Equipo de cómputo y accesorios', tipo: 'inversion' },
  { clave: 'I05', descripcion: 'I05 - Dados, troqueles, moldes, matrices y herramental', tipo: 'inversion' },
  { clave: 'I06', descripcion: 'I06 - Comunicaciones telefónicas', tipo: 'inversion' },
  { clave: 'I07', descripcion: 'I07 - Comunicaciones satelitales', tipo: 'inversion' },
  { clave: 'I08', descripcion: 'I08 - Otra maquinaria y equipo', tipo: 'inversion' },
  // Deducciones personales
  { clave: 'D01', descripcion: 'D01 - Honorarios médicos, dentales y gastos hospitalarios', tipo: 'deduccion' },
  { clave: 'D02', descripcion: 'D02 - Gastos médicos por incapacidad o discapacidad', tipo: 'deduccion' },
  { clave: 'D03', descripcion: 'D03 - Gastos funerales', tipo: 'deduccion' },
  { clave: 'D04', descripcion: 'D04 - Donativos', tipo: 'deduccion' },
  { clave: 'D05', descripcion: 'D05 - Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)', tipo: 'deduccion' },
  { clave: 'D06', descripcion: 'D06 - Aportaciones voluntarias al SAR', tipo: 'deduccion' },
  { clave: 'D07', descripcion: 'D07 - Primas por seguros de gastos médicos', tipo: 'deduccion' },
  { clave: 'D08', descripcion: 'D08 - Gastos de transportación escolar obligatoria', tipo: 'deduccion' },
  { clave: 'D09', descripcion: 'D09 - Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones', tipo: 'deduccion' },
  { clave: 'D10', descripcion: 'D10 - Pagos por servicios educativos (colegiaturas)', tipo: 'deduccion' },
];
