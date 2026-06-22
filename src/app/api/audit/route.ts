import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { username: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
