import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';


// GET /api/timetable
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const branchId = searchParams.get('branchId');

    // Students see their own timetable
    if (session.role === "STUDENT") {
      const student = await prisma.student.findFirst({ where: { userId: session.id } });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

      const timetable = await prisma.timetable.findFirst({
        where: { sectionId: student.sectionId },
        include: {
          slots: {
            include: { subject: true },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ timetable });
    }

    const where: Record<string, unknown> = {};
    if (sectionId) where.sectionId = sectionId;
    if (branchId) where.branchId = branchId;

    const timetables = await prisma.timetable.findMany({
      where,
      include: {
        section: true,
        branch: true,
        slots: {
          include: { subject: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    return NextResponse.json({ timetables });
  } catch (error) {
    console.error('Get timetable error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/timetable - Create/update timetable (admin only)
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
    const { branchId, sectionId, semester, academicYear, slots } = body;

    if (!branchId || !sectionId || !semester || !academicYear) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert timetable
    const timetable = await prisma.timetable.upsert({
      where: {
        branchId_sectionId_semester_academicYear: {
          branchId,
          sectionId,
          semester,
          academicYear,
        },
      },
      update: {},
      create: { branchId, sectionId, semester, academicYear },
    });

    // Replace slots
    await prisma.timetableSlot.deleteMany({ where: { timetableId: timetable.id } });

    if (slots && Array.isArray(slots)) {
      await prisma.timetableSlot.createMany({
        data: slots.map((slot: { dayOfWeek: number; startTime: string; endTime: string; subjectId?: string; facultyName?: string; room?: string }) => ({
          timetableId: timetable.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectId: slot.subjectId || null,
          facultyName: slot.facultyName || null,
          room: slot.room || null,
        })),
      });
    }

    return NextResponse.json({ success: true, timetable });
  } catch (error) {
    console.error('Create timetable error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

