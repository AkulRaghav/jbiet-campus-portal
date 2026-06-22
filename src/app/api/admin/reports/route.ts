import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireRole(session.role, ['ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Aggregate data from existing tables
    const [
      totalStudents, totalFaculty, branches,
      feeRecords, attendanceRecords, semResults,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.faculty.count(),
      prisma.branch.findMany({ include: { students: { select: { id: true } }, faculty: { select: { id: true } } } }),
      prisma.feeRecord.findMany(),
      prisma.attendance.findMany({ select: { status: true, sectionId: true } }),
      prisma.semesterResult.findMany({ include: { student: { select: { branchId: true } } } }),
    ]);

    // Fee collection stats
    const totalFeeExpected = feeRecords.reduce((s, f) => s + f.totalAmount, 0);
    const totalFeeCollected = feeRecords.reduce((s, f) => s + f.paidAmount, 0);
    const feeCollectionRate = totalFeeExpected > 0 ? Math.round((totalFeeCollected / totalFeeExpected) * 100) : 0;

    // Fee by category
    const feeByCategory: Record<string, { expected: number; collected: number }> = {};
    for (const f of feeRecords) {
      if (!feeByCategory[f.category]) feeByCategory[f.category] = { expected: 0, collected: 0 };
      feeByCategory[f.category].expected += f.totalAmount;
      feeByCategory[f.category].collected += f.paidAmount;
    }

    // Attendance stats
    const totalAttendanceRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    const avgAttendance = totalAttendanceRecords > 0 ? Math.round((presentCount / totalAttendanceRecords) * 100) : 0;

    // Branch-wise student count & avg SGPA
    const branchStats = branches.map(b => {
      const branchResults = semResults.filter(r => r.student.branchId === b.id);
      const avgSgpa = branchResults.length > 0 ? branchResults.reduce((s, r) => s + (r.sgpa || 0), 0) / branchResults.length : 0;
      return { id: b.id, name: b.name, shortName: b.shortName, students: b.students.length, faculty: b.faculty.length, avgSgpa: Math.round(avgSgpa * 100) / 100 };
    }).filter(b => b.students > 0);

    // Backlog rate
    const allSubjectResults = await prisma.subjectResult.findMany({ select: { isBacklog: true, backlogCleared: true } });
    const activeBacklogs = allSubjectResults.filter(r => r.isBacklog && !r.backlogCleared).length;
    const totalSubResults = allSubjectResults.length;
    const backlogRate = totalSubResults > 0 ? Math.round((activeBacklogs / totalSubResults) * 100) : 0;

    return NextResponse.json({
      overview: { totalStudents, totalFaculty, totalBranches: branches.length },
      fees: { totalExpected: totalFeeExpected, totalCollected: totalFeeCollected, collectionRate: feeCollectionRate, byCategory: feeByCategory },
      attendance: { avgAttendance, totalRecords: totalAttendanceRecords },
      academics: { branchStats, backlogRate, activeBacklogs },
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
