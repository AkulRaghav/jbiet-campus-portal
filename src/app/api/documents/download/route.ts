import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/documents/download?id=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    const document = await prisma.documentSubmission.findUnique({
      where: { id: documentId },
      include: { student: { select: { userId: true, sectionId: true, branchId: true } } },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // AUTHORIZATION: Check who can download
    if (session.role === 'STUDENT') {
      // Students can only download their own documents
      if (document.student.userId !== session.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (session.role === 'FACULTY') {
      // Faculty can only download documents submitted TO them
      const faculty = await prisma.faculty.findFirst({ where: { userId: session.id } });
      if (!faculty || document.submittedToId !== faculty.id) {
        return NextResponse.json({ error: 'You can only download documents submitted to you' }, { status: 403 });
      }
    } else if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // In production, this would generate a presigned S3 URL or stream the file.
    // For dev (mock storage), return the file URL for redirect.
    return NextResponse.json({
      success: true,
      downloadUrl: document.fileUrl,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
