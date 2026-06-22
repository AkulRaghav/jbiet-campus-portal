import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/notifications — get student's notifications
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'STUDENT') {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const student = await prisma.student.findFirst({ where: { userId: session.id } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const notifications = await prisma.notification.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: { studentId: student.id, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT /api/notifications — mark as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findFirst({ where: { userId: session.id } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();
    const { notificationId, markAllRead, documentId } = body;

    if (markAllRead) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { studentId: student.id, isRead: false },
        data: { isRead: true },
      });
    } else if (documentId) {
      // Mark all notifications for a specific document as read
      await prisma.notification.updateMany({
        where: { studentId: student.id, documentId, isRead: false },
        data: { isRead: true },
      });
    } else if (notificationId) {
      // Mark single notification as read (verify ownership)
      await prisma.notification.updateMany({
        where: { id: notificationId, studentId: student.id },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
