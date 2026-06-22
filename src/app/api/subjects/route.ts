import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const semester = searchParams.get('semester');

    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;
    if (semester) where.semester = parseInt(semester);

    const subjects = await prisma.subject.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
