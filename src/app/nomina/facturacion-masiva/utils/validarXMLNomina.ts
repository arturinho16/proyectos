import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type ValidationError = {
  code: string;
  message: string;
};

const MATRIX_ERRORS: Record<string, string> = {
  NOM1: 'Comprobante.Moneda debe ser MXN',
  NOM2: 'Comprobante.TipoDeComprobante debe ser N',
  NOM3: 'Comprobante.Exportacion debe ser 01',
  NOM4: 'Comprobante.InformacionGlobal no debe existir en nómina',
  NOM12: 'Nomina.Receptor.ClaveEntFed no existe en catálogo SAT',
  NOM58: 'Atributo Antigüedad inválido o inexistente',
};

function customRules(xml: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!xml.includes('Moneda="MXN"')) errors.push({ code: 'NOM1', message: MATRIX_ERRORS.NOM1 });
  if (!xml.includes('TipoDeComprobante="N"')) errors.push({ code: 'NOM2', message: MATRIX_ERRORS.NOM2 });
  if (!xml.includes('Exportacion="01"')) errors.push({ code: 'NOM3', message: MATRIX_ERRORS.NOM3 });
  if (xml.includes('cfdi:InformacionGlobal')) errors.push({ code: 'NOM4', message: MATRIX_ERRORS.NOM4 });

  const claveEntFed = xml.match(/ClaveEntFed="([^"]+)"/i)?.[1] ?? '';
  const valid = ['AGU','BCN','BCS','CAM','CHP','CHH','COA','COL','CMX','DUR','GUA','GRO','HID','JAL','MEX','MIC','MOR','NAY','NLE','OAX','PUE','QUE','ROO','SLP','SIN','SON','TAB','TAM','TLA','VER','YUC','ZAC'];
  if (claveEntFed && !valid.includes(claveEntFed)) errors.push({ code: 'NOM12', message: `${MATRIX_ERRORS.NOM12}: ${claveEntFed}` });

  if (xml.includes('Antiguedad=')) errors.push({ code: 'NOM58', message: 'Usa atributo Antigüedad (con diéresis) en Nomina12:Receptor' });

  return errors;
}

export function validarXMLNomina(xml: string, xsdPath = join(process.cwd(), 'src/lib/sat/nomina12.xsd')) {
  const errors: ValidationError[] = [...customRules(xml)];

  const tempXmlPath = join(tmpdir(), `nomina-${Date.now()}.xml`);
  writeFileSync(tempXmlPath, xml, 'utf8');

  const py = spawnSync('python3', ['-c', `
from lxml import etree
xsd_path = r'''${xsdPath}'''
xml_path = r'''${tempXmlPath}'''
try:
    schema = etree.XMLSchema(etree.parse(xsd_path))
    xml_doc = etree.parse(xml_path)
    nomina = xml_doc.find('.//{http://www.sat.gob.mx/nomina12}Nomina')
    if nomina is None:
        print('ERR|XSD|No se encontró nodo nomina12:Nomina')
    else:
        ok = schema.validate(etree.ElementTree(nomina))
        if ok:
            print('OK')
        else:
            for e in schema.error_log:
                print('ERR|XSD|' + e.message)
except Exception as e:
    print('ERR|XSD|' + str(e))
`]);

  unlinkSync(tempXmlPath);

  const out = py.stdout?.toString() ?? '';
  out.split('\n').filter(Boolean).forEach((line) => {
    if (line.startsWith('ERR|')) {
      const [, code, message] = line.split('|');
      errors.push({ code, message });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
