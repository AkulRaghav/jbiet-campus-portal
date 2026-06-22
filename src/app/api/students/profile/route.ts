import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

/**
 * Student self-edit profile API
 * 
 * LOCKED FIELDS (server-side enforced, never accepted from student):
 *   registrationNo, batch, batchYear, branchId, sectionId, regulation,
 *   collegeCode, branchCode, stream, admissionCategory, admissionNumber,
 *   dateOfAdmission, courseCompleted, eligibleHigherEd
 * 
 * EDITABLE FIELDS (student can update):
 *   fatherName, motherName, mobileNo, parentMobileNo, gender, nationality,
 *   caste, religion, isScholarshipHolder, email (on User), state, address,
 *   pincode, moleIdentification1, moleIdentification2
 * 
 * FLAGGED FOR CONFIRMATION (implemented as editable but noted):
 *   - name (Student's Name as per SSC): identity-critical, linked to SSC document
 *   - dateOfBirth: legal/identity document field
 *   - aadharNo: government ID, sensitive
 *   These are currently EDITABLE but may warrant admin-approval workflow.
 */

// Only these fields are accepted from student self-edit
const studentEditableSchema = z.object({
  // Flagged fields (editable but identity-sensitive)
  name: z.string().min(2).max(100).optional(),
  dateOfBirth: z.string().optional(),
  aadharNo: z.string().regex(/^\d{12}$/, 'Aadhar must be exactly 12 digits').optional().or(z.literal('')),

  // Clearly editable fields
  fatherName: z.string().max(100).optional(),
  motherName: z.string().max(100).optional(),
  mobileNo: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number').optional().or(z.literal('')),
  parentMobileNo: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number').optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  nationality: z.string().max(50).optional(),
  caste: z.string().max(50).optional(),
  religion: z.string().max(50).optional(),
  isScholarshipHolder: z.boolean().optional(),
  state: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional().or(z.literal('')),
  moleIdentification1: z.string().max(200).optional(),
  moleIdentification2: z.string().max(200).optional(),

  // Document URLs (re-upload)
  photoUrl: z.string().optional(),
  aadharCardUrl: z.string().optional(),
  sscCertificateUrl: z.string().optional(),
});

// These are the LOCKED fields — if any of these appear in payload, they are silently stripped
const LOCKED_FIELDS = [
  'registrationNo', 'batch', 'batchYear', 'branchId', 'sectionId', 'regulation',
  'collegeCode', 'branchCode', 'stream', 'admissionCategory', 'admissionNumber',
  'dateOfAdmission', 'courseCompleted', 'eligibleHigherEd', 'userId', 'id',
];

// PUT /api/students/profile — student self-edit
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'This endpoint is for students only' }, { status: 403 });
    }

    const student = await prisma.student.findFirst({ where: { userId: session.id } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();

    // SECURITY: Strip any locked fields from the payload, no matter what the client sends
    for (const field of LOCKED_FIELDS) {
      delete body[field];
    }

    // Validate the remaining fields
    const validation = studentEditableSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Build update object — only include fields that were actually provided
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.fatherName !== undefined) updateData.fatherName = data.fatherName;
    if (data.motherName !== undefined) updateData.motherName = data.motherName;
    if (data.mobileNo !== undefined) updateData.mobileNo = data.mobileNo || null;
    if (data.parentMobileNo !== undefined) updateData.parentMobileNo = data.parentMobileNo || null;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.nationality !== undefined) updateData.nationality = data.nationality;
    if (data.caste !== undefined) updateData.caste = data.caste;
    if (data.religion !== undefined) updateData.religion = data.religion;
    if (data.isScholarshipHolder !== undefined) updateData.isScholarshipHolder = data.isScholarshipHolder;
    if (data.aadharNo !== undefined) updateData.aadharNo = data.aadharNo || null;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.pincode !== undefined) updateData.pincode = data.pincode || null;
    if (data.moleIdentification1 !== undefined) updateData.moleIdentification1 = data.moleIdentification1;
    if (data.moleIdentification2 !== undefined) updateData.moleIdentification2 = data.moleIdentification2;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.aadharCardUrl !== undefined) updateData.aadharCardUrl = data.aadharCardUrl;
    if (data.sscCertificateUrl !== undefined) updateData.sscCertificateUrl = data.sscCertificateUrl;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Apply update
    const updated = await prisma.student.update({
      where: { id: student.id },
      data: updateData,
    });

    // Audit log
    await logAudit(session.id, 'STUDENT_SELF_EDIT', 'Student', student.id, updateData);

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error('Student profile edit error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
