import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const p = new PrismaClient();

async function main() {
  const admin = await p.user.findFirst({ where: { username: 'admin' } });
  if (!admin) { console.log('Admin not found'); return; }

  // Exam sessions
  const sessions = [
    { name: 'IV B.Tech II Sem R22 Regular', examType: 'Regular', semester: 8, regulation: 'R22', academicYear: '2025-2026', sessionMonth: 'Jun-2026', batchYears: '2022', registrationOpen: new Date('2026-05-15'), registrationClose: new Date('2026-07-15'), rvDeadline: new Date('2026-09-30'), isActive: true, createdById: admin.id },
    { name: 'IV B.Tech I Sem R22 Regular', examType: 'Regular', semester: 7, regulation: 'R22', academicYear: '2025-2026', sessionMonth: 'Jan-2026', batchYears: '2022', registrationOpen: new Date('2025-12-01'), registrationClose: new Date('2026-01-15'), rvDeadline: new Date('2026-04-30'), resultsPublished: true, isActive: true, createdById: admin.id },
    { name: 'III B.Tech II Sem R22 Regular', examType: 'Regular', semester: 6, regulation: 'R22', academicYear: '2024-2025', sessionMonth: 'Jul-2025', batchYears: '2022', registrationOpen: new Date('2025-06-01'), registrationClose: new Date('2025-06-20'), rvDeadline: new Date('2025-10-30'), resultsPublished: true, isActive: true, createdById: admin.id },
    { name: 'III B.Tech I Sem R22 Regular', examType: 'Regular', semester: 5, regulation: 'R22', academicYear: '2024-2025', sessionMonth: 'Dec-2024', batchYears: '2022', registrationOpen: new Date('2024-11-01'), registrationClose: new Date('2024-11-20'), resultsPublished: true, isActive: true, createdById: admin.id },
  ];
  for (const s of sessions) { try { await p.examSession.create({ data: s }); } catch {} }
  console.log('Exam sessions seeded');

  // Calendar events
  const events = [
    { title: 'IV B.Tech II Sem Regular Exams Begin', eventType: 'EXAM', startDate: new Date('2026-06-25'), endDate: new Date('2026-07-15'), createdById: admin.id },
    { title: 'Exam Registration Deadline', eventType: 'REGISTRATION', startDate: new Date('2026-06-20'), createdById: admin.id },
    { title: 'Independence Day', eventType: 'HOLIDAY', startDate: new Date('2026-08-15'), createdById: admin.id },
    { title: 'Semester Start', eventType: 'ACADEMIC', startDate: new Date('2026-07-01'), createdById: admin.id },
    { title: 'RV/RC Last Date', eventType: 'RV_WINDOW', startDate: new Date('2026-06-30'), createdById: admin.id },
  ];
  for (const e of events) { try { await p.academicCalendarEvent.create({ data: e }); } catch {} }
  console.log('Calendar events seeded');

  // Faculty
  const branches = await p.branch.findMany();
  const hash = await bcrypt.hash('Faculty@123', 12);
  const faculty = [
    { name: 'Dr. Priya Sharma', empId: 'FAC002', branch: 'CSE', qual: 'Ph.D Computer Science', desig: 'Professor' },
    { name: 'Prof. Ramesh Iyer', empId: 'FAC003', branch: 'CSE', qual: 'M.Tech AI', desig: 'Assistant Professor' },
    { name: 'Dr. Anitha Reddy', empId: 'FAC004', branch: 'ECE', qual: 'Ph.D VLSI', desig: 'Associate Professor' },
    { name: 'Prof. Suresh Kumar', empId: 'FAC005', branch: 'ME', qual: 'M.Tech Thermal', desig: 'Assistant Professor' },
    { name: 'Dr. Lakshmi Devi', empId: 'FAC006', branch: 'EEE', qual: 'Ph.D Power Systems', desig: 'Professor' },
    { name: 'Prof. Venkat Rao', empId: 'FAC007', branch: 'IT', qual: 'M.Tech Networks', desig: 'Assistant Professor' },
    { name: 'Dr. Kavitha Nair', empId: 'FAC008', branch: 'CSE', qual: 'Ph.D Data Science', desig: 'Associate Professor' },
    { name: 'Prof. Harish Gupta', empId: 'FAC009', branch: 'ECE', qual: 'M.Tech Embedded', desig: 'Assistant Professor' },
    { name: 'Dr. Meena Joshi', empId: 'FAC010', branch: 'CE', qual: 'Ph.D Structures', desig: 'Professor' },
    { name: 'Prof. Arun Patel', empId: 'FAC011', branch: 'CSE', qual: 'M.Tech Cybersecurity', desig: 'Assistant Professor' },
  ];
  for (const f of faculty) {
    const br = branches.find(b => b.shortName === f.branch);
    if (!br) continue;
    try {
      const user = await p.user.create({ data: { username: f.empId, email: `${f.empId.toLowerCase()}@jbiet.edu.in`, passwordHash: hash, role: 'FACULTY', mustChangePassword: false } });
      await p.faculty.create({ data: { userId: user.id, employeeId: f.empId, name: f.name, branchId: br.id, qualifications: f.qual, designation: f.desig } });
    } catch {}
  }
  console.log('Faculty seeded');

  // Contacts
  try { await p.contactDirectory.create({ data: { issueType: 'TUITION_FEE', label: 'Tuition Fee', contactName: 'Accounts', email: 'accounts@jbiet.edu.in', sortOrder: 1 } }); } catch {}
  try { await p.contactDirectory.create({ data: { issueType: 'EXAM_BRANCH', label: 'Exam Branch', contactName: 'CoE', email: 'exam@jbiet.edu.in', sortOrder: 2 } }); } catch {}
  try { await p.contactDirectory.create({ data: { issueType: 'GENERAL', label: 'Admin Office', contactName: 'Admin', email: 'admin@jbiet.edu.in', sortOrder: 3 } }); } catch {}
  console.log('Contacts seeded');

  console.log('Done!');
}

main().then(() => p.$disconnect()).catch(e => { console.error(e); p.$disconnect(); });
