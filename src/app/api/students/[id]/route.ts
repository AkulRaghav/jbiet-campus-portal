import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { updateStudentSchema } from '@/lib/validators/student';
import { logAudit } from '@/lib/audit';

// GET /api/students/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Students can only view their own profile
    if (session.role === 'STUDENT') {
      const student = await prisma.student.findFirst({ where: { userId: session.id } });
      if (!student || student.id !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (!requireRole(session.role, ['ADMIN', 'FACULTY', 'ACCOUNTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        branch: true,
        section: true,
        feeRecords: true,
        semesterResults: {
          include: { subjectResults: { include: { subject: true } } },
          orderBy: { semester: 'asc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Bus provider can only see bus fee info
    if (session.role === 'BUS_PROVIDER') {
      return NextResponse.json({
        student: {
          id: student.id,
          registrationNo: student.registrationNo,
          name: student.name,
          branchId: student.branchId,
          feeRecords: student.feeRecords.filter(f => f.category === 'BUS'),
        },
      });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Get student error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT /api/students/[id] - Update student (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateStudentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.fatherName !== undefined) updateData.fatherName = data.fatherName;
    if (data.motherName !== undefined) updateData.motherName = data.motherName;
    if (data.mobileNo !== undefined) updateData.mobileNo = data.mobileNo;
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.gender) updateData.gender = data.gender;
    if (data.nationality !== undefined) updateData.nationality = data.nationality;
    if (data.caste !== undefined) updateData.caste = data.caste;
    if (data.aadharNo !== undefined) updateData.aadharNo = data.aadharNo;
    if (data.isScholarshipHolder !== undefined) updateData.isScholarshipHolder = data.isScholarshipHolder;
    if (data.scholarshipAmount !== undefined) updateData.scholarshipAmount = data.scholarshipAmount;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.pincode !== undefined) updateData.pincode = data.pincode;
    if (data.parentMobileNo !== undefined) updateData.parentMobileNo = data.parentMobileNo;
    if (data.religion !== undefined) updateData.religion = data.religion;

    const updated = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    await logAudit(session.id, 'UPDATE_STUDENT', 'Student', id, updateData);

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/students/[id] - Delete student (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { id } = await params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Delete user (cascades to student)
    await prisma.user.delete({ where: { id: student.userId } });

    await logAudit(session.id, 'DELETE_STUDENT', 'Student', id, {
      rollNumber: student.registrationNo,
      name: student.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
