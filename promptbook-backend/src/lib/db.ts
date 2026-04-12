import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const POOLED_POSTGRES_PORTS = new Set(['6432', '6543'])

const isLikelyPooledPostgresUrl = (databaseUrl: URL) => {
  const hostname = databaseUrl.hostname.toLowerCase()

  return (
    hostname.includes('pooler') ||
    hostname.includes('pgbouncer') ||
    POOLED_POSTGRES_PORTS.has(databaseUrl.port)
  )
}

const resolveRuntimeDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  try {
    const parsedUrl = new URL(databaseUrl)

    // Prisma prepared statements break on transaction poolers unless pgbouncer
    // mode is enabled on the runtime connection string.
    if (!isLikelyPooledPostgresUrl(parsedUrl)) {
      return databaseUrl
    }

    if (!parsedUrl.searchParams.has('pgbouncer')) {
      parsedUrl.searchParams.set('pgbouncer', 'true')
    }

    if (!parsedUrl.searchParams.has('connection_limit')) {
      parsedUrl.searchParams.set('connection_limit', '1')
    }

    return parsedUrl.toString()
  } catch (error) {
    console.warn('Failed to normalize DATABASE_URL for Prisma runtime usage:', error)
    return databaseUrl
  }
}

// Create Prisma client with error handling
const createPrismaClient = () => {
  try {
    const runtimeDatabaseUrl = resolveRuntimeDatabaseUrl()

    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: runtimeDatabaseUrl,
        },
      },
    })
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    throw new Error('Database connection failed')
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
