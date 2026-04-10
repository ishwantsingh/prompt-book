import { createHmac } from 'crypto'

const TOKEN_ISSUER = 'promptbook-frontend'
const TOKEN_AUDIENCE = 'promptbook-backend'
const DEFAULT_TTL_SECONDS = 60 * 5

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

interface IssueBackendAccessTokenInput {
  userId: string
  email?: string | null
  username?: string | null
  displayName?: string | null
}

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function signPayload(payloadSegment: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadSegment).digest('base64url')
}

export function issueBackendAccessToken(
  input: IssueBackendAccessTokenInput
): string | null {
  const secret = process.env.NEXTAUTH_SECRET?.trim()
  if (!secret || !input.userId || !input.email) {
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  const payload: BackendAccessTokenPayload = {
    sub: input.userId,
    email: input.email,
    username: input.username || undefined,
    displayName: input.displayName || undefined,
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    iat: now,
    exp: now + DEFAULT_TTL_SECONDS,
  }

  const payloadSegment = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(payloadSegment, secret)

  return `${payloadSegment}.${signature}`
}
