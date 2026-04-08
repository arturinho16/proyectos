import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

// Rutas que no requieren autenticación
const publicRoutes = ['/login', '/api/auth/login'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  // Excluir archivos estáticos y rutas internas de Next.js
  if (path.startsWith('/_next') || path.includes('.')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('auth_session')?.value;
  const payload = token ? await verifyToken(token) : null;

  // Si intenta acceder a ruta privada sin sesión, redirigir a login
  if (!payload && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Si ya tiene sesión e intenta entrar al login, redirigir al dashboard
  if (payload && path === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
