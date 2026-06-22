import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

// GET /api/projects - List project groups
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const guideId = searchParams.get('guideId');

    const where: Record<string, unknown> = {};

    if (session.role === 'FACULTY') {
      const faculty = await prisma.faculty.findFirst({ where: { userId: session.id } });
      if (!faculty) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      where.guideId = faculty.id;
    } else if (guideId) {
      where.guideId = guideId;
    }

    const groups = await prisma.projectGroup.findMany({
      where,
      include: {
        guide: { select: { name: true, employeeId: true } },
        members: { include: { student: { select: { name: true, registrationNo: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/projects - Create project group (faculty only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ['FACULTY', 'ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const faculty = await prisma.faculty.findFirst({ where: { userId: session.id } });
    if (!faculty && session.role === 'FACULTY') {
      return NextResponse.json({ error: 'Faculty profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, projectType, studentIds, academicYear, semester, guideId } = body;

    if (!name || !projectType || !studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Enforce max 4 students for major projects
    if (projectType === 'MAJOR_PROJECT' && studentIds.length > 4) {
      return NextResponse.json(
        { error: 'Major project groups can have a maximum of 4 students' },
        { status: 400 }
      );
    }

    const effectiveGuideId = guideId || faculty?.id;
    if (!effectiveGuideId) {
      return NextResponse.json({ error: 'Guide ID required' }, { status: 400 });
    }

    const group = await prisma.projectGroup.create({
      data: {
        name,
        projectType,
        guideId: effectiveGuideId,
        academicYear: academicYear || '2024-2025',
        semester: semester || 7,
        members: {
          create: studentIds.map((studentId: string) => ({ studentId })),
        },
      },
      include: {
        members: { include: { student: { select: { name: true, registrationNo: true } } } },
      },
    });

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
