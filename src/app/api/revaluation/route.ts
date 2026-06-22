import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

// GET /api/revaluation — list RV requests
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (session.role === 'STUDENT') {
      const student = await prisma.student.findFirst({ where: { userId: session.id } });
      if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const requests = await prisma.revaluationRequest.findMany({
        where: { studentId: student.id },
        include: { subject: { select: { name: true, code: true } } },
        orderBy: { requestedAt: 'desc' },
      });
      return NextResponse.json({ requests });
    }

    if (requireRole(session.role, ['ADMIN'])) {
      const requests = await prisma.revaluationRequest.findMany({
        include: {
          student: { select: { name: true, registrationNo: true } },
          subject: { select: { name: true, code: true } },
        },
        orderBy: { requestedAt: 'desc' },
      });
      return NextResponse.json({ requests });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('RV requests error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/revaluation — student submits RV request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findFirst({ where: { userId: session.id } });
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { examSessionId, subjectId, semesterResultId, originalMarks, originalGrade, rvType, feeAmount } = body;

    if (!examSessionId || !subjectId || !semesterResultId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the exam session has RV window open
    const examSession = await prisma.examSession.findUnique({ where: { id: examSessionId } });
    if (!examSession) return NextResponse.json({ error: 'Exam session not found' }, { status: 404 });
    if (!examSession.rvDeadline || new Date() > new Date(examSession.rvDeadline)) {
      return NextResponse.json({ error: 'RV registration window is closed for this exam session' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await prisma.revaluationRequest.findFirst({
      where: { studentId: student.id, examSessionId, subjectId },
    });
    if (existing) return NextResponse.json({ error: 'RV already requested for this subject' }, { status: 409 });

    const rvRequest = await prisma.revaluationRequest.create({
      data: {
        studentId: student.id,
        examSessionId,
        subjectId,
        semesterResultId,
        originalMarks: originalMarks || null,
        originalGrade: originalGrade || null,
        feeAmount: feeAmount || (rvType === 'RECOUNTING' ? 300 : 500),
        status: `PENDING_${rvType || 'REVALUATION'}`,
      },
    });

    return NextResponse.json({ success: true, request: rvRequest }, { status: 201 });
  } catch (error) {
    console.error('RV request error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT /api/revaluation — admin processes RV request
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(session.role, ['ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { requestId, status, revisedMarks, revisedGrade } = body;

    if (!requestId || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const updated = await prisma.revaluationRequest.update({
      where: { id: requestId },
      data: {
        status,
        revisedMarks: revisedMarks || null,
        revisedGrade: revisedGrade || null,
        processedAt: new Date(),
        processedById: session.id,
      },
    });

    // If marks revised and grade changed, update the actual subject result
    if (status === 'COMPLETED_REVISED' && revisedMarks !== null) {
      const rvReq = await prisma.revaluationRequest.findUnique({ where: { id: requestId } });
      if (rvReq) {
        await prisma.subjectResult.updateMany({
          where: { semesterResultId: rvReq.semesterResultId, subjectId: rvReq.subjectId },
          data: {
            totalMarks: revisedMarks,
            grade: revisedGrade || undefined,
            isBacklog: revisedMarks < 40, // Pass mark threshold
            backlogCleared: revisedMarks >= 40,
          },
        });
      }
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error('Process RV error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
