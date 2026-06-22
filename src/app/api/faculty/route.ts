import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword, generatePassword, requireRole } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { logAudit } from '@/lib/audit';

import { z } from 'zod';

const createFacultySchema = z.object({
  name: z.string().min(2).max(100),
  employeeId: z.string().min(2).max(20),
  email: z.string().email(),
  branchId: z.string().min(1),
  qualifications: z.string().optional(),
  designation: z.string().optional(),
  mobileNo: z.string().regex(/^[6-9]\d{9}$/).optional(),
});

// GET /api/faculty
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;

    const faculty = await prisma.faculty.findMany({
      where,
      include: {
        branch: true,
        assignments: {
          include: { section: true, subject: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ faculty });
  } catch (error) {
    console.error('List faculty error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/faculty - Create faculty (admin only)
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
    const validation = createFacultySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const tempPassword = generatePassword();
    const passwordHash = await hashPassword(tempPassword);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: data.employeeId,
          email: data.email,
          passwordHash,
          role: "FACULTY",
          mustChangePassword: true,
        },
      });

      const faculty = await tx.faculty.create({
        data: {
          userId: user.id,
          employeeId: data.employeeId,
          name: data.name,
          branchId: data.branchId,
          qualifications: data.qualifications,
          designation: data.designation,
          mobileNo: data.mobileNo,
        },
      });

      return { user, faculty };
    });

    sendWelcomeEmail(data.email, data.employeeId, tempPassword, 'Faculty').catch(console.error);

    await logAudit(session.id, 'CREATE_FACULTY', 'Faculty', result.faculty.id, {
      employeeId: data.employeeId,
      name: data.name,
    });

    return NextResponse.json({
      success: true,
      faculty: result.faculty,
      message: `Faculty created. Credentials sent to ${data.email}.`,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create faculty error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Employee ID or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

