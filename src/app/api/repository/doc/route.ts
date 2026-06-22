import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Document ID required' }, { status: 400 });

    const doc = await prisma.documentSubmission.findUnique({
      where: { id },
      include: {
        student: { select: { name: true, registrationNo: true, userId: true, branch: { select: { shortName: true } } } },
      },
    });

    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Authorization: showcased = anyone logged in; non-showcased = restricted
    if (!doc.isShowcased) {
      if (session.role === 'STUDENT' && doc.student.userId !== session.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('Doc info error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
