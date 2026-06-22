import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { branchId, name, batchYear } = body;

    if (!branchId || !name || !batchYear) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const section = await prisma.section.create({
      data: { branchId, name, batchYear },
    });

    return NextResponse.json({ success: true, section }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Section already exists for this branch and batch' }, { status: 409 });
    }
    console.error('Create section error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
