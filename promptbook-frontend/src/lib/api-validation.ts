/**
 * Server-side validation helpers for API routes
 */

import { NextRequest } from 'next/server'
import { sanitizeFormData, validateEmail, validateUrl } from './security'

export interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => { isValid: boolean; error?: string }
  sanitize?: boolean
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationResult {
  isValid: boolean
  data: any
  errors: Record<string, string[]>
}

/**
 * Validate request body against schema
 */
export function validateRequestBody(
  request: NextRequest,
  schema: ValidationSchema
): Promise<ValidationResult> {
  return request.json().then(body => {
    return validateData(body, schema)
  }).catch(() => {
    return {
      isValid: false,
      data: {},
      errors: { _root: ['Invalid JSON body'] }
    }
  })
}

/**
 * Validate data against schema
 */
export function validateData(data: any, schema: ValidationSchema): ValidationResult {
  const errors: Record<string, string[]> = {}
  const validatedData: any = {}
  let isValid = true

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]
    const fieldErrors: string[] = []

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      fieldErrors.push(`${field} is required`)
      isValid = false
    }

    // Skip further validation if value is empty and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      validatedData[field] = value
      continue
    }

    // Type validation
    if (rules.type && value !== undefined && value !== null) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (actualType !== rules.type) {
        fieldErrors.push(`${field} must be of type ${rules.type}`)
        isValid = false
      }
    }

    // String validations
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        fieldErrors.push(`${field} must be at least ${rules.minLength} characters`)
        isValid = false
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        fieldErrors.push(`${field} must be no more than ${rules.maxLength} characters`)
        isValid = false
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        fieldErrors.push(`${field} format is invalid`)
        isValid = false
      }
    }

    // Number validations
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        fieldErrors.push(`${field} must be at least ${rules.min}`)
        isValid = false
      }
      if (rules.max !== undefined && value > rules.max) {
        fieldErrors.push(`${field} must be no more than ${rules.max}`)
        isValid = false
      }
    }

    // Array validations
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.minLength && value.length < rules.minLength) {
        fieldErrors.push(`${field} must have at least ${rules.minLength} items`)
        isValid = false
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        fieldErrors.push(`${field} must have no more than ${rules.maxLength} items`)
        isValid = false
      }
    }

    // Custom validation
    if (rules.custom) {
      const customResult = rules.custom(value)
      if (!customResult.isValid) {
        fieldErrors.push(customResult.error || `${field} is invalid`)
        isValid = false
      }
    }

    // Sanitize if requested
    if (rules.sanitize && typeof value === 'string') {
      const sanitized = sanitizeFormData({ [field]: value })
      validatedData[field] = sanitized.sanitized[field]
    } else {
      validatedData[field] = value
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors
    }
  }

  return {
    isValid,
    data: validatedData,
    errors
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  email: {
    required: true,
    type: 'string' as const,
    minLength: 5,
    maxLength: 254,
    custom: (value: string) => ({
      isValid: validateEmail(value),
      error: 'Invalid email format'
    }),
    sanitize: true
  },

  password: {
    required: true,
    type: 'string' as const,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    sanitize: true
  },

  title: {
    required: true,
    type: 'string' as const,
    minLength: 3,
    maxLength: 200,
    sanitize: true
  },

  description: {
    required: true,
    type: 'string' as const,
    minLength: 10,
    maxLength: 2000,
    sanitize: true
  },

  content: {
    required: true,
    type: 'string' as const,
    minLength: 10,
    maxLength: 10000,
    sanitize: true
  },

  tags: {
    required: false,
    type: 'array' as const,
    maxLength: 10,
    custom: (value: any[]) => ({
      isValid: Array.isArray(value) && value.every(tag => 
        typeof tag === 'string' && tag.length >= 2 && tag.length <= 50
      ),
      error: 'Tags must be an array of strings (2-50 characters each)'
    })
  },

  url: {
    required: false,
    type: 'string' as const,
    custom: (value: string) => ({
      isValid: validateUrl(value),
      error: 'Invalid URL format'
    }),
    sanitize: true
  }
}

/**
 * Create API response with validation errors
 */
export function createValidationErrorResponse(errors: Record<string, string[]>) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Validation failed',
      details: errors
    }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}

/**
 * Create API response for successful validation
 */
export function createSuccessResponse(data: any, message?: string) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      message
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}

/**
 * Create API response for errors
 */
export function createErrorResponse(message: string, status: number = 500) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}
