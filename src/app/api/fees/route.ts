import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';


// GET /api/fees
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    // Students see their own fees
    if (session.role === "STUDENT") {
      const student = await prisma.student.findFirst({ where: { userId: session.id } });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

      const feeRecords = await prisma.feeRecord.findMany({
        where: { studentId: student.id },
        orderBy: [{ semester: 'desc' }, { category: 'asc' }],
      });

      return NextResponse.json({ feeRecords });
    }

    // Bus provider can only see bus fees
    if (session.role === "BUS_PROVIDER") {
      const where: Record<string, unknown> = { category: "BUS" };
      if (studentId) where.studentId = studentId;

      const feeRecords = await prisma.feeRecord.findMany({
        where,
        include: {
          student: {
            select: { id: true, registrationNo: true, name: true, branchId: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json({ feeRecords });
    }

    if (!requireRole(session.role, ["ADMIN", "ACCOUNTANT"])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;

    const category = searchParams.get('category');
    if (category) where.category = category;

    const status = searchParams.get('status');
    if (status) where.status = status;

    const feeRecords = await prisma.feeRecord.findMany({
      where,
      include: {
        student: {
          select: { id: true, registrationNo: true, name: true, branchId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ feeRecords });
  } catch (error) {
    console.error('Get fees error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/fees - Create fee record (admin/accountant)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ["ADMIN", "ACCOUNTANT"])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, category, semester, academicYear, totalAmount, dueDate } = body;

    if (!studentId || !category || !semester || !academicYear || totalAmount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const feeRecord = await prisma.feeRecord.create({
      data: {
        studentId,
        category,
        semester,
        academicYear,
        totalAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json({ success: true, feeRecord }, { status: 201 });
  } catch (error) {
    console.error('Create fee error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT /api/fees - Update fee payment (admin/accountant/bus_provider)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { feeId, paidAmount, status, transactionId, remarks } = body;

    if (!feeId) {
      return NextResponse.json({ error: 'Fee record ID required' }, { status: 400 });
    }

    const feeRecord = await prisma.feeRecord.findUnique({ where: { id: feeId } });
    if (!feeRecord) {
      return NextResponse.json({ error: 'Fee record not found' }, { status: 404 });
    }

    // Bus provider can only update BUS fees
    if (session.role === "BUS_PROVIDER") {
      if (feeRecord.category !== "BUS") {
        return NextResponse.json(
          { error: 'Bus providers can only update bus fee records' },
          { status: 403 }
        );
      }
    } else if (!requireRole(session.role, ["ADMIN", "ACCOUNTANT"])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // UPDATED RULE (per real JBIET process): Exam fee/registration is DECOUPLED from tuition/transport fees.
    // Exam fee depends ONLY on being registered for the exam session.
    // However, HALL TICKET download IS gated on tuition/transport fee status (handled in hall-ticket endpoint).
    // The old blanket "can't pay exam fee if other fees unpaid" rule has been removed.

    const updated = await prisma.feeRecord.update({
      where: { id: feeId },
      data: {
        paidAmount: paidAmount !== undefined ? paidAmount : feeRecord.paidAmount,
        status: status || feeRecord.status,
        transactionId: transactionId || feeRecord.transactionId,
        remarks: remarks || feeRecord.remarks,
        paidDate: status === 'PAID' ? new Date() : feeRecord.paidDate,
      },
    });

    await logAudit(session.id, 'UPDATE_FEE', 'FeeRecord', feeId, {
      previousStatus: feeRecord.status,
      newStatus: status,
      paidAmount,
    });

    return NextResponse.json({ success: true, feeRecord: updated });
  } catch (error) {
    console.error('Update fee error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

