import * as forge from 'node-forge';

/**
 * Convierte un .cer (DER binario) a PEM
 */
export function cerToPem(cerB64: string): string {
  const der = forge.util.decode64(cerB64);
  const asn1 = forge.asn1.fromDer(der);
  const cert = forge.pki.certificateFromAsn1(asn1);
  return forge.pki.certificateToPem(cert);
}

/**
 * Desencripta el .key (DER encriptado) y retorna la llave privada en PEM
 */
export function keyToPem(keyB64: string, password: string): string {
  const keyDer = forge.util.decode64(keyB64);

  // Convertir DER a PEM encriptado manualmente (compatible con todas las versiones de node-forge)
  const keyPemEncriptado = forge.util.encode64(keyDer);
  const pemEncriptado = `-----BEGIN ENCRYPTED PRIVATE KEY-----\n${keyPemEncriptado.match(/.{1,64}/g)!.join('\n')}\n-----END ENCRYPTED PRIVATE KEY-----`;

  // Desencriptar con la contraseña
  const privateKey = forge.pki.decryptRsaPrivateKey(pemEncriptado, password);

  if (!privateKey) throw new Error('No se pudo desencriptar la llave privada. Verifica la contraseña.');
  return forge.pki.privateKeyToPem(privateKey);
}

/**
 * Extrae el número de certificado (NoCertificado) del .cer
 */
export function getNoCertificado(cerB64: string): string {
  const der = forge.util.decode64(cerB64);
  const asn1 = forge.asn1.fromDer(der);
  const cert = forge.pki.certificateFromAsn1(asn1);
  // El SAT espera el serial en HEX con padding par (20 caracteres)
  let serial = cert.serialNumber;
  if (serial.length % 2 !== 0) serial = '0' + serial;
  // Convertir hex a string de dígitos decimales alternos (formato SAT)
  return serial.replace(/../g, (h) => String.fromCharCode(parseInt(h, 16)))
    .split('').filter(c => /\d/.test(c)).join('');
}
/**
 * Extrae el contenido del .cer en base64 limpio (para el atributo Certificado del XML)
 */
export function getCertificadoBase64(cerB64: string): string {
  // Ya está en base64, solo limpiamos saltos de línea
  return cerB64.replace(/\s/g, '');
}

/**
 * Firma la cadena original con la llave privada usando SHA256
 * Retorna el sello en base64
 */
export function generarSello(cadenaOriginal: string, keyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(keyPem);
  const md = forge.md.sha256.create();
  md.update(cadenaOriginal, 'utf8');
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

/**
 * Genera la cadena original del CFDI 4.0
 * Formato: ||Version|...|campos|...||
 */
export function generarCadenaOriginal(campos: Record<string, string | undefined>): string {
  const pipe = '|';
  const values = Object.values(campos)
    .filter((v) => v !== undefined && v !== null && v !== '')
    .join(pipe);
  return `||${values}||`;
}