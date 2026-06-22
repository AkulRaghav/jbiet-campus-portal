import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

// GET /api/calendar — list academic events
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM format

    const where: Record<string, unknown> = {};
    if (month) {
      const start = new Date(`${month}-01`);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      where.startDate = { gte: start, lte: end };
    }

    const events = await prisma.academicCalendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Calendar error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/calendar — admin creates event
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(session.role, ['ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { title, description, eventType, startDate, endDate, appliesToAll, branchIds, batchYears } = body;

    if (!title || !eventType || !startDate) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const event = await prisma.academicCalendarEvent.create({
      data: {
        title, description: description || null, eventType,
        startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null,
        appliesToAll: appliesToAll !== false,
        branchIds: branchIds || null, batchYears: batchYears || null,
        createdById: session.id,
      },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error('Create calendar event error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
