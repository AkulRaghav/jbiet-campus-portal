import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';


// GET /api/results
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    // Students see their own results
    if (session.role === "STUDENT") {
      const student = await prisma.student.findFirst({ where: { userId: session.id } });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

      const results = await prisma.semesterResult.findMany({
        where: { studentId: student.id },
        include: {
          subjectResults: {
            include: { subject: true },
          },
        },
        orderBy: { semester: 'asc' },
      });

      // Calculate active backlogs
      const activeBacklogs = results
        .flatMap(r => r.subjectResults)
        .filter(sr => sr.isBacklog && !sr.backlogCleared);

      return NextResponse.json({ results, activeBacklogs });
    }

    if (!requireRole(session.role, ["ADMIN", "FACULTY"])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (studentId) {
      const results = await prisma.semesterResult.findMany({
        where: { studentId },
        include: {
          subjectResults: { include: { subject: true } },
        },
        orderBy: { semester: 'asc' },
      });
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: 'studentId required' }, { status: 400 });
  } catch (error) {
    console.error('Get results error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/results - Create/update results (admin only)
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
    const { studentId, semester, academicYear, sgpa, cgpa, totalCredits, earnedCredits, subjects } = body;

    if (!studentId || !semester || !academicYear) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert semester result
    const semesterResult = await prisma.semesterResult.upsert({
      where: {
        studentId_semester_academicYear: {
          studentId,
          semester,
          academicYear,
        },
      },
      update: { sgpa, cgpa, totalCredits, earnedCredits },
      create: {
        studentId,
        semester,
        academicYear,
        sgpa,
        cgpa,
        totalCredits,
        earnedCredits,
      },
    });

    // Add subject results
    if (subjects && Array.isArray(subjects)) {
      for (const subject of subjects) {
        await prisma.subjectResult.upsert({
          where: {
            semesterResultId_subjectId: {
              semesterResultId: semesterResult.id,
              subjectId: subject.subjectId,
            },
          },
          update: {
            internalMarks: subject.internalMarks,
            externalMarks: subject.externalMarks,
            totalMarks: subject.totalMarks,
            grade: subject.grade,
            gradePoints: subject.gradePoints,
            credits: subject.credits,
            isBacklog: subject.isBacklog || false,
            backlogCleared: subject.backlogCleared || false,
            clearedInSemester: subject.clearedInSemester,
          },
          create: {
            semesterResultId: semesterResult.id,
            subjectId: subject.subjectId,
            internalMarks: subject.internalMarks,
            externalMarks: subject.externalMarks,
            totalMarks: subject.totalMarks,
            grade: subject.grade,
            gradePoints: subject.gradePoints,
            credits: subject.credits,
            isBacklog: subject.isBacklog || false,
            backlogCleared: subject.backlogCleared || false,
            clearedInSemester: subject.clearedInSemester,
          },
        });
      }
    }

    await logAudit(session.id, 'UPDATE_RESULT', 'SemesterResult', semesterResult.id, {
      studentId,
      semester,
      sgpa,
      cgpa,
    });

    return NextResponse.json({ success: true, semesterResult });
  } catch (error) {
    console.error('Create result error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

