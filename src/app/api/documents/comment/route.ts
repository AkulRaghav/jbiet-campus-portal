import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'FACULTY' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only faculty can comment' }, { status: 403 });
    }

    const faculty = await prisma.faculty.findFirst({ where: { userId: session.id } });
    if (!faculty) {
      return NextResponse.json({ error: 'Faculty profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { documentId, content } = body;

    if (!documentId || !content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Document ID and comment content required' }, { status: 400 });
    }

    // Get the document with student info
    const document = await prisma.documentSubmission.findUnique({
      where: { id: documentId },
      include: {
        student: {
          include: { user: { select: { email: true } } },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // AUTHORIZATION: Faculty can only comment on docs submitted to them
    if (session.role === 'FACULTY' && document.submittedToId !== faculty.id) {
      return NextResponse.json({ error: 'You can only comment on documents submitted to you' }, { status: 403 });
    }

    // Create the comment
    const comment = await prisma.documentComment.create({
      data: {
        documentId,
        facultyId: faculty.id,
        content: content.trim(),
      },
    });

    // --- IN-APP NOTIFICATION ---
    const commentPreview = content.trim().length > 80
      ? content.trim().slice(0, 80) + '...'
      : content.trim();

    await prisma.notification.create({
      data: {
        studentId: document.studentId,
        type: 'DOCUMENT_COMMENT',
        title: `New comment on "${document.title}"`,
        message: `${faculty.name} commented: "${commentPreview}"`,
        linkUrl: '/dashboard/student/documents',
        documentId: document.id,
      },
    });

    // --- EMAIL NOTIFICATION (non-blocking, failure doesn't break in-app) ---
    const studentEmail = document.student.user.email;
    if (studentEmail) {
      const emailPreview = content.trim().length > 150
        ? content.trim().slice(0, 150) + '...'
        : content.trim();

      const portalUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      emailService.send({
        to: studentEmail,
        subject: `JBIET Portal — New comment on your submission "${document.title}"`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
            <div style="background: #3B6FF2; padding: 16px 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 16px;">JBIET Exam Portal</h2>
            </div>
            <div style="padding: 24px; background: #fff; border: 1px solid #ECEDF1; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 12px; color: #1A1D26; font-size: 14px;">
                <strong>${faculty.name}</strong> commented on your submission:
              </p>
              <div style="background: #F5F6FA; border-left: 3px solid #3B6FF2; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
                <p style="margin: 0 0 6px; color: #1A1D26; font-size: 13px; font-weight: 600;">${document.title}</p>
                <p style="margin: 0; color: #6B7280; font-size: 13px;">"${emailPreview}"</p>
              </div>
              <a href="${portalUrl}/dashboard/student/documents" style="display: inline-block; background: #3B6FF2; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">View Full Comment</a>
              <p style="margin: 16px 0 0; color: #9CA3AF; font-size: 11px;">This is an automated notification. Do not reply to this email.</p>
            </div>
          </div>
        `,
        text: `${faculty.name} commented on your submission "${document.title}": "${emailPreview}"\n\nView it at: ${portalUrl}/dashboard/student/documents`,
      }).catch(err => {
        // Email failure must not break the flow — log and continue
        console.error('[Notification] Email send failed:', err);
      });
    }

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
