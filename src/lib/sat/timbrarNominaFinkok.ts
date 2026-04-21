import * as soap from 'soap';

const WSDL_DEMO = 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';
const WSDL_PROD = 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl';

export async function timbrarNominaFinkok(xmlFirmado: string) {
    const usuario = process.env.FINKOK_USER ?? process.env.FINKOK_USUARIO;
    const password = process.env.FINKOK_PASSWORD;
    const ambiente = process.env.FINKOK_AMBIENTE ?? 'demo';
    const wsdl = process.env.FINKOK_STAMP_URL || (ambiente === 'prod' ? WSDL_PROD : WSDL_DEMO);

    if (!usuario || !password) {
        throw new Error('Faltan credenciales de Finkok en variables de entorno');
    }

    const client = await soap.createClientAsync(wsdl);
    const xmlBase64 = Buffer.from(xmlFirmado, 'utf8').toString('base64');
    const [result] = await client.stampAsync({ xml: xmlBase64, username: usuario, password });
    const stampResult = result?.stampResult;

    if (!stampResult?.UUID) {
        const incidencias = stampResult?.Incidencias?.Incidencia;
        const incidencia = Array.isArray(incidencias) ? incidencias[0] : incidencias;
        throw new Error(incidencia?.MensajeIncidencia || stampResult?.CodEstatus || 'Error de timbrado con Finkok');
    }

    let xmlTimbrado = stampResult.xml;
    if (Buffer.isBuffer(xmlTimbrado)) xmlTimbrado = xmlTimbrado.toString('utf8');
    if (typeof xmlTimbrado !== 'string') xmlTimbrado = String(xmlTimbrado);
    if (!xmlTimbrado.includes('cfdi:Comprobante')) {
        const decoded = Buffer.from(xmlTimbrado, 'base64').toString('utf8');
        if (decoded.includes('cfdi:Comprobante')) xmlTimbrado = decoded;
    }

    return {
        uuid: stampResult.UUID as string,
        xmlTimbrado: xmlTimbrado.replace(/^\uFEFF/, '').trim(),
        noCertificadoSAT: stampResult.NoCertificadoSAT as string,
        codEstatus: stampResult.CodEstatus as string,
        raw: stampResult,
    };
}
