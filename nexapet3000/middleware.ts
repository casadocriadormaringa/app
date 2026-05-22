import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // List of old administrative paths that should now be redirected to home
  // if accessed without the secret prefix.
  const adminPaths = [
    '/agenda',
    '/banhos',
    '/banhos-pets',
    '/cadeado',
    '/entregas',
    '/fornecedores',
    '/gerencial',
    '/pedidos',
    '/produtos',
    '/relatorios',
    '/vendas',
    '/admin',
    '/avisos'
  ]

  // Check if the current request is for one of the old admin paths
  const isOldAdminPath = adminPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  )

  if (isOldAdminPath) {
    console.log(`Redirecting unauthorized access to ${pathname} to home.`);
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/agenda/:path*',
    '/banhos/:path*',
    '/banhos-pets/:path*',
    '/cadeado/:path*',
    '/entregas/:path*',
    '/fornecedores/:path*',
    '/gerencial/:path*',
    '/pedidos/:path*',
    '/produtos/:path*',
    '/relatorios/:path*',
    '/vendas/:path*',
    '/admin/:path*',
    '/avisos/:path*'
  ],
}
