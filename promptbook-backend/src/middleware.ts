import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://www.promptbook.info',
  'https://promptbook.info',
  'https://prompt-book-frontend.vercel.app',
  'https://prompt-book-frontend-ishwantsinghs-projects.vercel.app',
  'https://prompt-book-frontend-git-main-ishwantsinghs-projects.vercel.app',
]

function getAllowedOrigins(): Set<string> {
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const origin = request.headers.get('origin')
  const allowedOrigins = getAllowedOrigins()
  const isAllowedOrigin = !!origin && allowedOrigins.has(origin)

  if (origin && !isAllowedOrigin && request.method === 'OPTIONS') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  if (origin && isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Vary', 'Origin')
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers })
  }

  return response
}

export const config = {
  matcher: ['/api/:path*']
}
