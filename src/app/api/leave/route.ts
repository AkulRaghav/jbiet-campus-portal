import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/leave — faculty sees own leaves, admin sees all
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (session.role === 'FACULTY') {
      const faculty = await prisma.faculty.findFirst({ where: { userId: session.id } });
      if (!faculty) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const [applications, balances] = await Promise.all([
        prisma.leaveApplication.findMany({ where: { facultyId: faculty.id }, orderBy: { appliedAt: 'desc' } }),
        prisma.leaveBalance.findMany({ where: { facultyId: faculty.id } }),
      ]);
      return NextResponse.json({ applications, balances });
    }

    if (requireRole(session.role, ['ADMIN'])) {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const where: Record<string, unknown> = {};
      if (status) where.status = status;

      const applications = await prisma.leaveApplication.findMany({
        where,
        include: { faculty: { select: { name: true, employeeId: true, branch: { select: { shortName: true } } } } },
        orderBy: { appliedAt: 'desc' },
      });
      return NextResponse.json({ applications });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Leave error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/leave — faculty submits leave application
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'FACULTY') {
      return NextResponse.json({ error: 'Only faculty can apply for leave' }, { status: 403 });
    }

    const faculty = await prisma.faculty.findFirst({ where: { userId: session.id } });
    if (!faculty) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { leaveType, fromDate, toDate, reason } = body;

    if (!leaveType || !fromDate || !toDate || !reason) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });

    const totalDays = Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1;

    // Check balance
    const year = `${from.getFullYear()}-${from.getFullYear() + 1}`;
    const balance = await prisma.leaveBalance.findFirst({
      where: { facultyId: faculty.id, leaveType, academicYear: year },
    });

    if (balance && (balance.used + totalDays > balance.totalAllotted)) {
      return NextResponse.json({ error: `Insufficient ${leaveType} balance. Available: ${balance.totalAllotted - balance.used} days` }, { status: 400 });
    }

    const application = await prisma.leaveApplication.create({
      data: { facultyId: faculty.id, leaveType, fromDate: from, toDate: to, totalDays, reason },
    });

    return NextResponse.json({ success: true, application }, { status: 201 });
  } catch (error) {
    console.error('Leave apply error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT /api/leave — admin approves/rejects
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(session.role, ['ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { applicationId, status, comments } = body;

    if (!applicationId || !status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'applicationId and valid status required' }, { status: 400 });
    }

    const app = await prisma.leaveApplication.findUnique({ where: { id: applicationId } });
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

    const updated = await prisma.leaveApplication.update({
      where: { id: applicationId },
      data: { status, reviewedById: session.id, reviewedAt: new Date(), reviewerComments: comments || null },
    });

    // If approved, update balance
    if (status === 'APPROVED') {
      const year = `${app.fromDate.getFullYear()}-${app.fromDate.getFullYear() + 1}`;
      await prisma.leaveBalance.upsert({
        where: { facultyId_leaveType_academicYear: { facultyId: app.facultyId, leaveType: app.leaveType, academicYear: year } },
        update: { used: { increment: app.totalDays } },
        create: { facultyId: app.facultyId, leaveType: app.leaveType, academicYear: year, totalAllotted: 12, used: app.totalDays },
      });
    }

    await logAudit(session.id, `LEAVE_${status}`, 'LeaveApplication', applicationId, { facultyId: app.facultyId, days: app.totalDays });

    return NextResponse.json({ success: true, application: updated });
  } catch (error) {
    console.error('Leave review error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
