import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    // 1. Protección Fuerza Bruta: Máximo 5 intentos fallidos en 15 minutos
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);
    const failedAttempts = await prisma.loginAttempt.count({
      where: { email, success: false, createdAt: { gte: windowStart } },
    });

    if (failedAttempts >= 5) {
      return NextResponse.json({ error: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intente en 15 minutos.' }, { status: 429 });
    }

    // 2. Buscar usuario (Si no hay usuarios, creamos el admin por defecto para que puedas entrar la primera vez)
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user && email === 'admin@tufisti.com') {
      const hash = await bcrypt.hash('admin123', 12); // Argon2/Bcrypt cost 12
      user = await prisma.user.create({
        data: { email: 'admin@tufisti.com', password: hash, nombre: 'Administrador' }
      });
    }

    if (!user) {
      await prisma.loginAttempt.create({ data: { email, ip, success: false } });
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // 3. Verificar contraseña
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await prisma.loginAttempt.create({ data: { email, ip, success: false } });
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // 4. Éxito: Registrar login y generar JWT
    await prisma.loginAttempt.create({ data: { email, ip, success: true } });
    
    const token = await signToken({ userId: user.id, email: user.email, rol: user.rol });

    // 5. Establecer Cookie httpOnly
    const response = NextResponse.json({ success: true, nombre: user.nombre });
    response.cookies.set({
      name: 'auth_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60, // 30 minutos
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
