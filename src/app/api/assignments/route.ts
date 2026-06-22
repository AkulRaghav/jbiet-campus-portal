import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

// POST /api/assignments - Create faculty assignment (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { facultyId, sectionId, subjectId, semester, academicYear, isClassTeacher } = body;

    if (!facultyId || !sectionId || !subjectId || !semester || !academicYear) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if assignment already exists
    const existing = await prisma.facultyAssignment.findFirst({
      where: { facultyId, sectionId, subjectId, semester, academicYear },
    });

    if (existing) {
      return NextResponse.json({ error: 'This assignment already exists' }, { status: 409 });
    }

    const assignment = await prisma.facultyAssignment.create({
      data: {
        facultyId,
        sectionId,
        subjectId,
        semester,
        academicYear,
        isClassTeacher: isClassTeacher || false,
      },
    });

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error) {
    console.error('Create assignment error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/assignments - Remove assignment (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    await prisma.facultyAssignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete assignment error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
