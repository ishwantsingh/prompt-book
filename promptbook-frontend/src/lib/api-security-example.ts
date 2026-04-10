/**
 * Example of how to use the security utilities in API routes
 * This file demonstrates best practices for secure API endpoints
 */

import { NextRequest } from 'next/server'
import { validateRequestBody, commonSchemas, createValidationErrorResponse, createSuccessResponse } from './api-validation'
import { sanitizeTextInput } from './security'

// Example: Secure prompt creation API route
export async function POST(request: NextRequest) {
  try {
    // Define validation schema
    const schema = {
      title: commonSchemas.title,
      description: commonSchemas.description,
      prompt: commonSchemas.content,
      categoryId: {
        required: true,
        type: 'string' as const,
        pattern: /^[a-zA-Z0-9-_]+$/,
        sanitize: true
      },
      subcategoryId: {
        required: false,
        type: 'string' as const,
        pattern: /^[a-zA-Z0-9-_]+$/,
        sanitize: true
      },
      tags: commonSchemas.tags
    }

    // Validate request body
    const validation = await validateRequestBody(request, schema)
    
    if (!validation.isValid) {
      return createValidationErrorResponse(validation.errors)
    }

    // Additional security checks
    const { prompt } = validation.data
    
    // Sanitize prompt content for XSS prevention
    const sanitizedPrompt = sanitizeTextInput(prompt, {
      maxLength: 10000,
      allowHtml: false,
      stripHtml: true
    })

    if (!sanitizedPrompt.isValid) {
      return createValidationErrorResponse({
        prompt: sanitizedPrompt.errors
      })
    }

    // Use sanitized data
    const secureData = {
      ...validation.data,
      prompt: sanitizedPrompt.sanitized
    }

    // TODO: Save to database
    // await savePrompt(secureData)

    return createSuccessResponse(secureData, 'Prompt created successfully')

  } catch (error) {
    console.error('API Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Example: Secure user profile update API route
export async function PUT(request: NextRequest) {
  try {
    const schema = {
      displayName: {
        required: false,
        type: 'string' as const,
        minLength: 2,
        maxLength: 100,
        sanitize: true
      },
      bio: {
        required: false,
        type: 'string' as const,
        maxLength: 500,
        sanitize: true
      },
      website: commonSchemas.url
    }

    const validation = await validateRequestBody(request, schema)
    
    if (!validation.isValid) {
      return createValidationErrorResponse(validation.errors)
    }

    // Additional validation for display name
    if (validation.data.displayName) {
      const sanitized = sanitizeTextInput(validation.data.displayName, {
        maxLength: 100,
        allowHtml: false
      })
      
      if (!sanitized.isValid) {
        return createValidationErrorResponse({
          displayName: sanitized.errors
        })
      }
      
      validation.data.displayName = sanitized.sanitized
    }

    // TODO: Update user profile
    // await updateUserProfile(validation.data)

    return createSuccessResponse(validation.data, 'Profile updated successfully')

  } catch (error) {
    console.error('API Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Example: Secure search API route with rate limiting consideration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    // Validate query parameters
    if (!query || query.length < 2) {
      return createValidationErrorResponse({
        q: ['Search query must be at least 2 characters']
      })
    }

    // Sanitize search query
    const sanitizedQuery = sanitizeTextInput(query, {
      maxLength: 100,
      allowHtml: false,
      stripHtml: true
    })

    if (!sanitizedQuery.isValid) {
      return createValidationErrorResponse({
        q: sanitizedQuery.errors
      })
    }

    // Validate pagination parameters
    const pageNum = page ? parseInt(page) : 1
    const limitNum = limit ? parseInt(limit) : 20

    if (pageNum < 1 || pageNum > 1000) {
      return createValidationErrorResponse({
        page: ['Page must be between 1 and 1000']
      })
    }

    if (limitNum < 1 || limitNum > 100) {
      return createValidationErrorResponse({
        limit: ['Limit must be between 1 and 100']
      })
    }

    // TODO: Perform search with sanitized query
    // const results = await searchPrompts(sanitizedQuery.sanitized, pageNum, limitNum)

    return createSuccessResponse({
      query: sanitizedQuery.sanitized,
      page: pageNum,
      limit: limitNum,
      results: [] // TODO: Replace with actual results
    })

  } catch (error) {
    console.error('Search API Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Search failed'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
