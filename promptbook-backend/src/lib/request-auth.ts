import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const TOKEN_ISSUER = 'promptbook-frontend'
const TOKEN_AUDIENCE = 'promptbook-backend'

interface BackendAccessTokenPayload {
  sub: string
  email: string
  username?: string
  displayName?: string
  iss: string
  aud: string
  iat: number
  exp: number
}

export interface AuthenticatedUser {
  userId: string
  email: string
  username?: string
  displayName?: string
}

class RequestAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 401
  ) {
    super(message)
    this.name = 'RequestAuthError'
  }
}

function getAuthSecret(): string | null {
  return process.env.NEXTAUTH_SECRET?.trim() || null
}

function parseCsvSet(value?: string): Set<string> {
  return new Set(
    (value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  )
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding =
    normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8')
}

function signPayload(payloadSegment: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadSegment).digest('base64url')
}

function verifyBackendAccessToken(token: string, secret: string): AuthenticatedUser {
  const [payloadSegment, signatureSegment] = token.split('.')
  if (!payloadSegment || !signatureSegment) {
    throw new RequestAuthError('Invalid access token')
  }

  const expectedSignature = Buffer.from(signPayload(payloadSegment, secret))
  const receivedSignature = Buffer.from(signatureSegment)
  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    throw new RequestAuthError('Invalid access token')
  }

  let payload: BackendAccessTokenPayload
  try {
    payload = JSON.parse(fromBase64Url(payloadSegment)) as BackendAccessTokenPayload
  } catch {
    throw new RequestAuthError('Invalid access token')
  }

  const now = Math.floor(Date.now() / 1000)
  if (
    !payload.sub ||
    !payload.email ||
    payload.iss !== TOKEN_ISSUER ||
    payload.aud !== TOKEN_AUDIENCE ||
    !payload.exp ||
    payload.exp <= now
  ) {
    throw new RequestAuthError('Access token has expired or is malformed')
  }

  return {
    userId: payload.sub,
    email: payload.email,
    username: payload.username,
    displayName: payload.displayName,
  }
}

export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return null
  }

  const [scheme, token] = authorization.split(' ')
  if (scheme !== 'Bearer' || !token) {
    throw new RequestAuthError('Invalid authorization header')
  }

  const secret = getAuthSecret()
  if (!secret) {
    throw new RequestAuthError('NEXTAUTH_SECRET must be configured', 500)
  }

  return verifyBackendAccessToken(token, secret)
}

export async function requireAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser> {
  const user = await authenticateRequest(request)
  if (!user) {
    throw new RequestAuthError('Authentication required')
  }

  return user
}

export async function requireAdminUser(
  request: NextRequest
): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUser(request)
  const allowedUserIds = parseCsvSet(process.env.ADMIN_USER_IDS)
  const allowedUserEmails = new Set(
    Array.from(parseCsvSet(process.env.ADMIN_USER_EMAILS)).map((email) =>
      email.toLowerCase()
    )
  )

  if (
    !allowedUserIds.has(user.userId) &&
    !allowedUserEmails.has(user.email.toLowerCase())
  ) {
    throw new RequestAuthError('Admin access required', 403)
  }

  return user
}

export function getAuthErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof RequestAuthError)) {
    return null
  }

  return NextResponse.json(
    { success: false, error: error.message },
    { status: error.status }
  )
}
