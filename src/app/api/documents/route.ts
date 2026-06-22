import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

// GET /api/documents
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const sectionId = searchParams.get('sectionId');
    const studentId = searchParams.get('studentId');

    // Students see their own submissions
    if (session.role === 'STUDENT') {
      const student = await prisma.student.findFirst({ where: { userId: session.id } });
      if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const documents = await prisma.documentSubmission.findMany({
        where: { studentId: student.id },
        include: {
          submittedTo: { select: { name: true, employeeId: true } },
          comments: {
            include: { faculty: { select: { name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ documents });
    }

    // Faculty: scoped to documents submitted TO them
    if (session.role === 'FACULTY') {
      const faculty = await prisma.faculty.findFirst({ where: { userId: session.id } });
      if (!faculty) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      // Build filter: always submittedToId = this faculty
      const where: Record<string, unknown> = { submittedToId: faculty.id };

      // Optional: filter by student for drill-down
      if (studentId) {
        where.studentId = studentId;
      }

      // If branchId/sectionId provided, filter students by those first
      if (branchId || sectionId) {
        const studentFilter: Record<string, unknown> = {};
        if (branchId) studentFilter.branchId = branchId;
        if (sectionId) studentFilter.sectionId = sectionId;

        const studentsInScope = await prisma.student.findMany({
          where: studentFilter,
          select: { id: true },
        });
        where.studentId = { in: studentsInScope.map(s => s.id) };
      }

      const documents = await prisma.documentSubmission.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, registrationNo: true, branchId: true, sectionId: true } },
          comments: {
            include: { faculty: { select: { name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Also provide distinct branches/sections that have submissions for this faculty
      const allDocs = await prisma.documentSubmission.findMany({
        where: { submittedToId: faculty.id },
        include: {
          student: {
            select: { branchId: true, sectionId: true, branch: { select: { id: true, name: true, shortName: true } }, section: { select: { id: true, name: true, batchYear: true } } },
          },
        },
      });

      // Extract unique branches and sections
      const branchMap = new Map<string, { id: string; name: string; shortName: string }>();
      const sectionMap = new Map<string, { id: string; name: string; batchYear: number; branchId: string }>();
      for (const doc of allDocs) {
        branchMap.set(doc.student.branchId, doc.student.branch);
        sectionMap.set(doc.student.sectionId, { ...doc.student.section, branchId: doc.student.branchId });
      }

      return NextResponse.json({
        documents,
        branches: Array.from(branchMap.values()),
        sections: Array.from(sectionMap.values()),
      });
    }

    // Admin sees all
    if (requireRole(session.role, ['ADMIN'])) {
      const documents = await prisma.documentSubmission.findMany({
        include: {
          student: { select: { name: true, registrationNo: true } },
          submittedTo: { select: { name: true, employeeId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return NextResponse.json({ documents });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/documents - Submit document (student)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can submit documents' }, { status: 403 });
    }

    const student = await prisma.student.findFirst({ where: { userId: session.id } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const body = await request.json();
    const { title, type, projectType, description, fileUrl, fileName, fileSize, mimeType, submittedToId } = body;

    if (!title || !type || !fileUrl || !fileName) {
      return NextResponse.json({ error: 'Missing required fields (title, type, fileUrl, fileName)' }, { status: 400 });
    }

    if (!submittedToId) {
      return NextResponse.json({ error: 'Please select which faculty member to submit this to' }, { status: 400 });
    }

    const faculty = await prisma.faculty.findUnique({ where: { id: submittedToId } });
    if (!faculty) {
      return NextResponse.json({ error: 'Selected faculty not found' }, { status: 400 });
    }

    const document = await prisma.documentSubmission.create({
      data: {
        studentId: student.id,
        submittedToId,
        title,
        type,
        projectType: projectType || null,
        description: description || null,
        fileUrl,
        fileName,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/pdf',
      },
    });

    return NextResponse.json({ success: true, document }, { status: 201 });
  } catch (error) {
    console.error('Submit document error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}


// DELETE /api/documents — student deletes own submission (blocked if faculty has commented)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'STUDENT') return NextResponse.json({ error: 'Only students can delete their submissions' }, { status: 403 });

    const student = await prisma.student.findFirst({ where: { userId: session.id } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    if (!documentId) return NextResponse.json({ error: 'Document ID required' }, { status: 400 });

    const doc = await prisma.documentSubmission.findUnique({
      where: { id: documentId },
      include: { comments: true },
    });

    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // AUTHORIZATION: must be the student's own document
    if (doc.studentId !== student.id) {
      return NextResponse.json({ error: 'You can only delete your own documents' }, { status: 403 });
    }

    // RULE: Cannot delete if faculty has already commented (preserves review history)
    if (doc.comments.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete — this document has faculty comments. You can upload a new version instead to preserve the review history.',
      }, { status: 400 });
    }

    // Safe to delete
    await prisma.documentSubmission.delete({ where: { id: documentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
