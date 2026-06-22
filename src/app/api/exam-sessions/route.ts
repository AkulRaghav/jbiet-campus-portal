import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

// GET /api/exam-sessions — list sessions (filtered by role)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';

    if (session.role === 'STUDENT') {
      const student = await prisma.student.findFirst({ where: { userId: session.id } });
      if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      // Only show sessions matching this student's batch/regulation
      const sessions = await prisma.examSession.findMany({
        where: {
          isActive: activeOnly ? true : undefined,
          regulation: student.regulation || 'R22',
          batchYears: { contains: String(student.batchYear) },
        },
        orderBy: { registrationClose: 'desc' },
      });

      // Add registration status for each session
      const regs = await prisma.examRegistration.findMany({
        where: { studentId: student.id },
      });
      const regMap = new Map(regs.map(r => [r.examSessionId, r]));

      const enriched = sessions.map(s => ({
        ...s,
        registered: regMap.has(s.id),
        registration: regMap.get(s.id) || null,
        isOpen: new Date() >= new Date(s.registrationOpen) && new Date() <= new Date(s.registrationClose),
        isClosed: new Date() > new Date(s.registrationClose),
      }));

      return NextResponse.json({ sessions: enriched });
    }

    // Admin sees all
    if (requireRole(session.role, ['ADMIN'])) {
      const sessions = await prisma.examSession.findMany({ orderBy: { createdAt: 'desc' } });
      return NextResponse.json({ sessions });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Exam sessions error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/exam-sessions — create session (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(session.role, ['ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { name, examType, semester, regulation, academicYear, sessionMonth, batchYears, branchIds, registrationOpen, registrationClose, rvDeadline } = body;

    if (!name || !examType || !semester || !regulation || !academicYear || !sessionMonth || !batchYears || !registrationOpen || !registrationClose) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const examSession = await prisma.examSession.create({
      data: {
        name, examType, semester, regulation, academicYear, sessionMonth,
        batchYears: Array.isArray(batchYears) ? batchYears.join(',') : batchYears,
        branchIds: branchIds ? (Array.isArray(branchIds) ? branchIds.join(',') : branchIds) : null,
        registrationOpen: new Date(registrationOpen),
        registrationClose: new Date(registrationClose),
        rvDeadline: rvDeadline ? new Date(rvDeadline) : null,
        createdById: session.id,
      },
    });

    return NextResponse.json({ success: true, examSession }, { status: 201 });
  } catch (error) {
    console.error('Create exam session error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
