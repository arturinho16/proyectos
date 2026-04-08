import { SignJWT, jwtVerify } from 'jose';

// En producción, asegúrate de poner un JWT_SECRET largo y seguro en tu .env
const secretKey = process.env.JWT_SECRET || 'tufisti-super-secret-key-2026-secure-auth';
const encodedKey = new TextEncoder().encode(secretKey);

export async function signToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m') // Expiración en backend: 30 minutos
    .sign(encodedKey);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey);
    return payload;
  } catch (error) {
    return null; // Token inválido o expirado
  }
}
