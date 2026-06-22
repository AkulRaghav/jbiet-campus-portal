import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// POST /api/exam-registration — student registers for an exam session
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findFirst({ where: { userId: session.id } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const body = await request.json();
    const { examSessionId } = body;
    if (!examSessionId) return NextResponse.json({ error: 'Exam session ID required' }, { status: 400 });

    // Verify session exists, is active, and registration is open
    const examSession = await prisma.examSession.findUnique({ where: { id: examSessionId } });
    if (!examSession) return NextResponse.json({ error: 'Exam session not found' }, { status: 404 });
    if (!examSession.isActive) return NextResponse.json({ error: 'This exam session is no longer active' }, { status: 400 });

    const now = new Date();
    if (now < new Date(examSession.registrationOpen)) {
      return NextResponse.json({ error: 'Registration has not opened yet' }, { status: 400 });
    }
    if (now > new Date(examSession.registrationClose)) {
      return NextResponse.json({ error: 'Registration is closed' }, { status: 400 });
    }

    // Verify student matches this session's batch/regulation
    if (!examSession.batchYears.split(',').includes(String(student.batchYear))) {
      return NextResponse.json({ error: 'This exam session does not apply to your batch' }, { status: 403 });
    }

    // Check if already registered
    const existing = await prisma.examRegistration.findFirst({
      where: { studentId: student.id, examSessionId },
    });
    if (existing) return NextResponse.json({ error: 'Already registered for this session' }, { status: 409 });

    const registration = await prisma.examRegistration.create({
      data: { studentId: student.id, examSessionId },
    });

    return NextResponse.json({ success: true, registration }, { status: 201 });
  } catch (error) {
    console.error('Exam registration error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT /api/exam-registration — pay exam fee
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findFirst({ where: { userId: session.id } });
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { examSessionId, transactionId } = body;

    const reg = await prisma.examRegistration.findFirst({
      where: { studentId: student.id, examSessionId },
    });
    if (!reg) return NextResponse.json({ error: 'Not registered for this session' }, { status: 400 });

    // NOTE: Exam fee is decoupled from tuition/transport fees (per JBIET real process)
    // Only requires being registered for the session
    const updated = await prisma.examRegistration.update({
      where: { id: reg.id },
      data: { examFeePaid: true, examFeeAmount: 2000, examFeeTransId: transactionId || null, hallTicketReady: true },
    });

    return NextResponse.json({ success: true, registration: updated });
  } catch (error) {
    console.error('Exam fee payment error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
