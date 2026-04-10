/**
 * Security utilities for input sanitization and validation
 */

// HTML entities mapping for XSS prevention
const HTML_ENTITIES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '&': '&amp;',
  '`': '&#x60;',
  '=': '&#x3D;'
}

// Dangerous patterns to detect and block
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
  /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
  /@import/gi,
  /vbscript:/gi,
  /data:/gi,
  /blob:/gi
]

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /(\b(OR|AND)\s+['"]\s*=\s*['"])/gi,
  /(UNION\s+SELECT)/gi,
  /(DROP\s+TABLE)/gi,
  /(DELETE\s+FROM)/gi,
  /(INSERT\s+INTO)/gi,
  /(UPDATE\s+SET)/gi,
  /(EXEC\s*\()/gi,
  /(SCRIPT\s*\()/gi
]

/**
 * Sanitize HTML content by escaping dangerous characters
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  return input.replace(/[<>&"'`=\/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Remove all HTML tags from input
 */
export function stripHtml(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Check if input contains dangerous patterns
 */
export function containsDangerousPatterns(input: string): boolean {
  if (typeof input !== 'string') {
    return false
  }
  
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(input))
}

/**
 * Check if input contains SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return false
  }
  
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
}

/**
 * Validate and sanitize text input
 */
export function sanitizeTextInput(input: string, options: {
  maxLength?: number
  allowHtml?: boolean
  stripHtml?: boolean
} = {}): {
  sanitized: string
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  let sanitized = input || ''
  
  // Check for dangerous patterns
  if (containsDangerousPatterns(sanitized)) {
    errors.push('Input contains potentially dangerous content')
  }
  
  if (containsSqlInjection(sanitized)) {
    errors.push('Input contains potential SQL injection patterns')
  }
  
  // Apply sanitization
  if (options.stripHtml) {
    sanitized = stripHtml(sanitized)
  } else if (!options.allowHtml) {
    sanitized = sanitizeHtml(sanitized)
  }
  
  // Check length
  if (options.maxLength && sanitized.length > options.maxLength) {
    errors.push(`Input exceeds maximum length of ${options.maxLength} characters`)
    sanitized = sanitized.substring(0, options.maxLength)
  }
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  return {
    sanitized,
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

/**
 * Sanitize and validate form data
 */
export function sanitizeFormData(data: Record<string, any>): {
  sanitized: Record<string, any>
  isValid: boolean
  errors: Record<string, string[]>
} {
  const sanitized: Record<string, any> = {}
  const errors: Record<string, string[]> = {}
  let isValid = true
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      const result = sanitizeTextInput(value, {
        maxLength: 10000, // Default max length
        allowHtml: false
      })
      
      sanitized[key] = result.sanitized
      
      if (!result.isValid) {
        errors[key] = result.errors
        isValid = false
      }
    } else {
      sanitized[key] = value
    }
  }
  
  return { sanitized, isValid, errors }
}

/**
 * Rate limiting helper for API routes
 */
export function createRateLimitKey(identifier: string, endpoint: string): string {
  return `rate_limit:${identifier}:${endpoint}`
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  identifier: string, 
  endpoint: string, 
  limit: number, 
  windowMs: number,
  store: Map<string, { count: number; resetTime: number }>
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = createRateLimitKey(identifier, endpoint)
  const now = Date.now()
  const current = store.get(key)
  
  if (!current || now > current.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs }
  }
  
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime }
  }
  
  current.count++
  return { allowed: true, remaining: limit - current.count, resetTime: current.resetTime }
}
