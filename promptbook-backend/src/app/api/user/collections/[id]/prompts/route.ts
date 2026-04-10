import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'

// This would be imported from the collections route in a real implementation
// For now, we'll use a simple in-memory store
const mockCollections = new Map<string, {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  promptIds: string[];
  createdAt: Date;
  updatedAt: Date;
}>();

// Initialize with some mock data
mockCollections.set('1', {
  id: '1',
  userId: 'demo-user',
  name: 'Work Templates',
  description: 'Professional email and document templates for work',
  isPublic: false,
  promptIds: ['1', '3', '5'],
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
});
type RouteContext = { params: Promise<{ id: string }> }

// POST /api/user/collections/[id]/prompts - Add prompt to collection
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const { id: collectionId } = await params;
    const { promptId } = await request.json();
    const userId = user.userId

    if (!promptId) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      );
    }

    const collection = mockCollections.get(collectionId);
    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check if user owns the collection
    if (collection.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this collection' },
        { status: 403 }
      );
    }

    // Check if prompt is already in collection
    if (collection.promptIds.includes(promptId)) {
      return NextResponse.json(
        { error: 'Prompt is already in this collection' },
        { status: 400 }
      );
    }

    // Add prompt to collection
    collection.promptIds.push(promptId);
    collection.updatedAt = new Date();

    return NextResponse.json({
      success: true,
      collection,
      message: 'Prompt added to collection'
    });

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error adding prompt to collection:', error);
    return NextResponse.json(
      { error: 'Failed to add prompt to collection' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/collections/[id]/prompts - Remove prompt from collection
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const { id: collectionId } = await params;
    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get('promptId');
    const userId = user.userId;

    if (!promptId) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      );
    }

    const collection = mockCollections.get(collectionId);
    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check if user owns the collection
    if (collection.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this collection' },
        { status: 403 }
      );
    }

    // Remove prompt from collection
    const promptIndex = collection.promptIds.indexOf(promptId);
    if (promptIndex === -1) {
      return NextResponse.json(
        { error: 'Prompt not found in this collection' },
        { status: 404 }
      );
    }

    collection.promptIds.splice(promptIndex, 1);
    collection.updatedAt = new Date();

    return NextResponse.json({
      success: true,
      collection,
      message: 'Prompt removed from collection'
    });

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error removing prompt from collection:', error);
    return NextResponse.json(
      { error: 'Failed to remove prompt from collection' },
      { status: 500 }
    );
  }
}
