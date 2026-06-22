import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword, generatePassword, requireRole } from '@/lib/auth';
import { generateRollNumber } from '@/lib/roll-number';
import { createStudentSchema } from '@/lib/validators/student';
import { sendWelcomeEmail } from '@/lib/email';
import { logAudit } from '@/lib/audit';


// GET /api/students - List students (admin/faculty)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ["ADMIN", "FACULTY"])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const branchId = searchParams.get('branchId');
    const sectionId = searchParams.get('sectionId');
    const batchYear = searchParams.get('batchYear');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;
    if (sectionId) where.sectionId = sectionId;
    if (batchYear) where.batchYear = parseInt(batchYear);
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { registrationNo: { contains: search } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: { branch: true, section: true },
        orderBy: { registrationNo: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List students error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/students - Create student (admin only)
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
    const validation = createStudentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get branch to determine branch code
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) {
      return NextResponse.json({ error: 'Invalid branch' }, { status: 400 });
    }

    // Generate roll number
    const rollNumber = await generateRollNumber(data.batchYear, branch.branchCode);

    // Generate password
    const tempPassword = generatePassword();
    const passwordHash = await hashPassword(tempPassword);

    // Create user + student in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: rollNumber,
          email: data.email,
          passwordHash,
          role: "STUDENT",
          mustChangePassword: true,
        },
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          registrationNo: rollNumber,
          batch: `${data.batchYear}-${data.batchYear + 4}`,
          batchYear: data.batchYear,
          branchId: data.branchId,
          sectionId: data.sectionId,
          branchCode: branch.branchCode,
          name: data.name,
          fatherName: data.fatherName,
          motherName: data.motherName,
          mobileNo: data.mobileNo,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          nationality: data.nationality,
          caste: data.caste,
          aadharNo: data.aadharNo,
          isScholarshipHolder: data.isScholarshipHolder || false,
          scholarshipAmount: data.scholarshipAmount || 0,
          state: data.state,
          address: data.address,
          pincode: data.pincode,
          parentMobileNo: data.parentMobileNo,
          religion: data.religion,
          moleIdentification1: data.moleIdentification1,
          moleIdentification2: data.moleIdentification2,
          regulation: data.regulation,
          stream: data.stream,
          admissionCategory: data.admissionCategory,
          admissionNumber: data.admissionNumber,
          dateOfAdmission: data.dateOfAdmission ? new Date(data.dateOfAdmission) : null,
        },
      });

      return { user, student };
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(data.email, rollNumber, tempPassword, 'Student').catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    // Audit log
    await logAudit(session.id, 'CREATE_STUDENT', 'Student', result.student.id, {
      rollNumber,
      name: data.name,
      branch: branch.name,
    });

    return NextResponse.json({
      success: true,
      student: result.student,
      rollNumber,
      message: `Student created with roll number ${rollNumber}. Temporary password sent to ${data.email}.`,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create student error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A student with this email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

