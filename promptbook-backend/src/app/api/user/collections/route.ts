import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'

// Mock collections data
const mockCollections = [
  {
    id: '1',
    userId: 'demo-user',
    name: 'Work Templates',
    description: 'Professional email and document templates for work',
    isPublic: false,
    promptIds: ['1', '3', '5'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
  {
    id: '2',
    userId: 'demo-user',
    name: 'Creative Writing',
    description: 'Prompts for creative writing and storytelling',
    isPublic: true,
    promptIds: ['2', '4'],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  },
  {
    id: '3',
    userId: 'demo-user',
    name: 'Code Review',
    description: 'Templates and guidelines for code reviews',
    isPublic: false,
    promptIds: ['6'],
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
    updatedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
  },
];

// GET /api/user/collections - Get user's collections
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const { searchParams } = new URL(request.url);
    const userId = user.userId;
    const includePublic = searchParams.get('includePublic') === 'true';

    // Filter collections for the user
    let collections = mockCollections.filter(c => c.userId === userId);

    // If includePublic is true, add public collections from other users
    if (includePublic) {
      const publicCollections = mockCollections.filter(c => c.isPublic && c.userId !== userId);
      collections = [...collections, ...publicCollections];
    }

    // Sort by most recently updated
    collections.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return NextResponse.json({
      collections,
      total: collections.length
    });

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

// POST /api/user/collections - Create new collection
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const { name, description, isPublic } = await request.json();
    const userId = user.userId

    if (!name) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    const newCollection = {
      id: Date.now().toString(),
      userId,
      name,
      description: description || '',
      isPublic: isPublic || false,
      promptIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to mock data
    mockCollections.push(newCollection);

    return NextResponse.json({ 
      success: true, 
      collection: newCollection 
    });

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}
