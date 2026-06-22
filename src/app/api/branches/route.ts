import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      include: { sections: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ branches });
  } catch (error) {
    console.error('Get branches error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
