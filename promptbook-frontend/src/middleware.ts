import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiting store (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // Max requests per window
const RATE_LIMIT_MAX_API_REQUESTS = 30 // Max API requests per window

function getRateLimitKey(ip: string, pathname: string): string {
  return `${ip}:${pathname}`
}

function checkRateLimit(ip: string, pathname: string, isApi: boolean): boolean {
  const key = getRateLimitKey(ip, pathname)
  const now = Date.now()
  const maxRequests = isApi ? RATE_LIMIT_MAX_API_REQUESTS : RATE_LIMIT_MAX_REQUESTS
  
  const current = rateLimitStore.get(key)
  
  if (!current || now > current.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false // Rate limit exceeded
  }
  
  current.count++
  return true
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip =
    forwardedFor?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  
  // Define known safe routes
  const knownRoutes = [
    '/',
    '/about',
    '/contact',
    '/prompts',
    '/auth/signin',
    '/profile',
    '/saved',
    '/admin',
    '/users',
    '/api',
  ]
  
  // Check if the pathname matches any known route or starts with known prefixes
  const isKnownRoute = knownRoutes.some(route => 
    pathname === route || 
    pathname.startsWith(route + '/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap')
  )
  
  // Define suspicious paths to watch for
  const suspiciousPaths = [
    '/cmd_sco',
    '/admin',
    '/cmd',
    '/dashboard',
    '/wp-admin',
    '/phpmyadmin',
    '/.env',
    '/config',
    '/backup',
    '/test',
    '/debug'
  ]
  
  // Define suspicious user agents
  const suspiciousUserAgents = [
    'python',
    'curl',
    'wget',
    'nmap',
    'sqlmap',
    'nikto',
    'gobuster',
    'dirb',
    'scanner',
    'bot',
    'crawler',
    'spider'
  ]
  
  // Check if this is a suspicious request
  const isSuspiciousPath = suspiciousPaths.some(path => pathname.includes(path))
  const isSuspiciousUserAgent = suspiciousUserAgents.some(ua => 
    userAgent.toLowerCase().includes(ua.toLowerCase())
  )
  
  // Check rate limiting
  const isApi = pathname.startsWith('/api/')
  const isRateLimited = !checkRateLimit(ip, pathname, isApi)
  
  if (isRateLimited) {
    console.log('🚫 Rate limit exceeded:', {
      timestamp: new Date().toISOString(),
      pathname,
      ip,
      userAgent,
      method: request.method
    })
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    })
  }
  
  // Log suspicious requests
  if (!isKnownRoute || isSuspiciousPath || isSuspiciousUserAgent) {
    console.log('🚨 Suspicious request detected:', {
      timestamp: new Date().toISOString(),
      pathname,
      ip,
      userAgent,
      isKnownRoute,
      isSuspiciousPath,
      isSuspiciousUserAgent,
      method: request.method,
      referer: request.headers.get('referer') || 'none'
    })
  }
  
  // Optional: Block suspicious requests (commented out by default)
  // Uncomment the following block to enable blocking
  /*
  if (isSuspiciousPath || isSuspiciousUserAgent) {
    console.log('🚫 Blocking suspicious request:', { pathname, ip, userAgent })
    return new NextResponse('Forbidden', { status: 403 })
  }
  */
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
