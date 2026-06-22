import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

// GET /api/contacts — public contact directory
export async function GET() {
  try {
    const contacts = await prisma.contactDirectory.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Contacts error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/contacts — admin creates/updates contact entry
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(session.role, ['ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { issueType, label, contactName, phone, email, description, sortOrder } = body;

    if (!issueType || !label) return NextResponse.json({ error: 'issueType and label required' }, { status: 400 });

    const contact = await prisma.contactDirectory.upsert({
      where: { issueType },
      update: { label, contactName, phone, email, description, sortOrder: sortOrder || 0 },
      create: { issueType, label, contactName, phone, email, description, sortOrder: sortOrder || 0 },
    });

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error('Contact update error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
