import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/repository — browsable list of showcased documents
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const branchId = searchParams.get('branchId') || '';

    const where: Record<string, unknown> = { isShowcased: true };

    if (category) where.type = category;

    // Search in title, abstract, and extracted text
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { abstract: { contains: search } },
        { extractedText: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Filter by branch through student relation
    const documents = await prisma.documentSubmission.findMany({
      where,
      include: {
        student: {
          select: { name: true, registrationNo: true, batchYear: true, branch: { select: { id: true, name: true, shortName: true } } },
        },
      },
      orderBy: { showcasedAt: 'desc' },
      take: 50,
    });

    // Filter by branch after fetch if specified (SQLite doesn't support nested where well)
    const filtered = branchId
      ? documents.filter(d => d.student.branch.id === branchId)
      : documents;

    return NextResponse.json({ documents: filtered });
  } catch (error) {
    console.error('Repository error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT /api/repository — admin/faculty approve a document for showcase
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'ADMIN' && session.role !== 'FACULTY') {
      return NextResponse.json({ error: 'Only admin/faculty can showcase documents' }, { status: 403 });
    }

    const body = await request.json();
    const { documentId, showcase, abstract } = body;

    if (!documentId) return NextResponse.json({ error: 'Document ID required' }, { status: 400 });

    const doc = await prisma.documentSubmission.update({
      where: { id: documentId },
      data: {
        isShowcased: showcase !== false,
        showcasedAt: showcase !== false ? new Date() : null,
        abstract: abstract || undefined,
      },
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('Showcase error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
