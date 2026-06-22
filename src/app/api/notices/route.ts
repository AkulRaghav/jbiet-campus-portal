import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';


// GET /api/notices - Public, no auth required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const notices = await prisma.publicNotice.findMany({
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ notices });
  } catch (error) {
    console.error('Get notices error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/notices - Create notice (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ["ADMIN"])) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, fileUrl } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const notice = await prisma.publicNotice.create({
      data: {
        title,
        content: content || null,
        fileUrl: fileUrl || null,
        createdById: session.id,
      },
    });

    return NextResponse.json({ success: true, notice }, { status: 201 });
  } catch (error) {
    console.error('Create notice error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

