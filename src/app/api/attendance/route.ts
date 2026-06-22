import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';


// GET /api/attendance - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const sectionId = searchParams.get('sectionId');
    const subjectId = searchParams.get('subjectId');
    const date = searchParams.get('date');

    // Students can only see their own attendance
    if (session.role === "STUDENT") {
      const student = await prisma.student.findFirst({ where: { userId: session.id } });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

      const records = await prisma.attendance.findMany({
        where: { studentId: student.id },
        include: { subject: true },
        orderBy: { date: 'desc' },
      });

      // Calculate percentages
      const subjectWise: Record<string, { total: number; present: number; subjectName: string }> = {};
      let totalClasses = 0;
      let totalPresent = 0;

      for (const record of records) {
        totalClasses++;
        if (record.status === 'PRESENT') totalPresent++;

        if (!subjectWise[record.subjectId]) {
          subjectWise[record.subjectId] = { total: 0, present: 0, subjectName: record.subject.name };
        }
        subjectWise[record.subjectId].total++;
        if (record.status === 'PRESENT') subjectWise[record.subjectId].present++;
      }

      const subjectPercentages = Object.entries(subjectWise).map(([subjectId, data]) => ({
        subjectId,
        subjectName: data.subjectName,
        total: data.total,
        present: data.present,
        percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      }));

      return NextResponse.json({
        records,
        summary: {
          totalClasses,
          totalPresent,
          overallPercentage: totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0,
          subjectWise: subjectPercentages,
        },
      });
    }

    if (!requireRole(session.role, ["ADMIN", "FACULTY"])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;
    if (date) where.date = new Date(date);

    const records = await prisma.attendance.findMany({
      where,
      include: { student: true, subject: true },
      orderBy: { date: 'desc' },
      take: 500,
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/attendance - Mark attendance (faculty only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ["ADMIN", "FACULTY"])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { sectionId, subjectId, date, semester, academicYear, records } = body;

    if (!sectionId || !subjectId || !date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // HARD RULE: Faculty can only mark attendance for TODAY's date
    // Past-date editing is not allowed (prevents retroactive tampering)
    // Admin bypass allowed for corrections
    if (session.role === "FACULTY") {
      const today = new Date().toISOString().split('T')[0];
      const requestDate = new Date(date).toISOString().split('T')[0];
      if (requestDate !== today) {
        return NextResponse.json(
          { error: 'Attendance can only be marked for today\'s date. Past-date corrections require admin approval.' },
          { status: 403 }
        );
      }
    }

    // Verify faculty is assigned to this section/subject
    if (session.role === "FACULTY") {
      const faculty = await prisma.faculty.findFirst({ where: { userId: session.id } });
      if (!faculty) return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });

      const assignment = await prisma.facultyAssignment.findFirst({
        where: {
          facultyId: faculty.id,
          sectionId,
          subjectId,
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not assigned to this section/subject' },
          { status: 403 }
        );
      }
    }

    // Upsert attendance records
    const attendanceDate = new Date(date);
    const results = await prisma.$transaction(
      records.map((record: { studentId: string; status: 'PRESENT' | 'ABSENT' }) =>
        prisma.attendance.upsert({
          where: {
            studentId_subjectId_date: {
              studentId: record.studentId,
              subjectId,
              date: attendanceDate,
            },
          },
          update: { status: record.status },
          create: {
            studentId: record.studentId,
            subjectId,
            sectionId,
            date: attendanceDate,
            status: record.status,
            markedById: session.id,
            semester: semester || 1,
            academicYear: academicYear || '2024-2025',
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: results.length,
      message: `Attendance marked for ${results.length} students`,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

