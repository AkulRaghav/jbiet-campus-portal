import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get extended user info based on role
    let profile = null;
    if (session.role === 'STUDENT') {
      profile = await prisma.student.findFirst({
        where: { userId: session.id },
        include: { branch: true, section: true },
      });
    } else if (session.role === 'FACULTY') {
      profile = await prisma.faculty.findFirst({
        where: { userId: session.id },
        include: {
          branch: true,
          assignments: {
            include: { section: true, subject: true },
          },
        },
      });
    }

    return NextResponse.json({
      user: session,
      profile,
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
