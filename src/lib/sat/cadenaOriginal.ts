import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-ignore
import { Xslt, XmlParser } from 'xslt-processor';

const xsltPath = join(process.cwd(), 'src/lib/sat/cadena-original.xslt');
const xsltContent = readFileSync(xsltPath, 'utf8');

export async function buildCadenaOriginal(xmlString: string): Promise<string> {
    const xslt = new Xslt();
    const parser = new XmlParser();
    const xmlDoc = parser.xmlParse(xmlString);
    const xsltDoc = parser.xmlParse(xsltContent);
    const result = await xslt.xsltProcess(xmlDoc, xsltDoc);
    let cadena = String(result).replace(/[\r\n\t]/g, '').trim();
    if (!cadena.startsWith('||')) cadena = `||${cadena.replace(/^\|+/, '')}`;
    return `${cadena.replace(/\|+$/, '')}||`;
}
