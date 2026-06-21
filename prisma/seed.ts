import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create branches
  const branches = await Promise.all([
    prisma.branch.upsert({ where: { code: '01-CE' }, update: {}, create: { name: 'Civil Engineering', code: '01-CE', branchCode: 'A01', shortName: 'CE' } }),
    prisma.branch.upsert({ where: { code: '02-EEE' }, update: {}, create: { name: 'Electrical & Electronics Engineering', code: '02-EEE', branchCode: 'A02', shortName: 'EEE' } }),
    prisma.branch.upsert({ where: { code: '03-ME' }, update: {}, create: { name: 'Mechanical Engineering', code: '03-ME', branchCode: 'A03', shortName: 'ME' } }),
    prisma.branch.upsert({ where: { code: '04-ECE' }, update: {}, create: { name: 'Electronics & Communication Engineering', code: '04-ECE', branchCode: 'A04', shortName: 'ECE' } }),
    prisma.branch.upsert({ where: { code: '05-CSE' }, update: {}, create: { name: 'Computer Science & Engineering', code: '05-CSE', branchCode: 'A05', shortName: 'CSE' } }),
    prisma.branch.upsert({ where: { code: '12-IT' }, update: {}, create: { name: 'Information Technology', code: '12-IT', branchCode: 'A12', shortName: 'IT' } }),
    prisma.branch.upsert({ where: { code: '19-ECM' }, update: {}, create: { name: 'Electronics & Computer Engineering', code: '19-ECM', branchCode: 'A19', shortName: 'ECM' } }),
    prisma.branch.upsert({ where: { code: '72-AIDS' }, update: {}, create: { name: 'Artificial Intelligence and Data Science', code: '72-AIDS', branchCode: 'A72', shortName: 'AI&DS' } }),
    prisma.branch.upsert({ where: { code: '73-AIML' }, update: {}, create: { name: 'Artificial Intelligence and Machine Learning', code: '73-AIML', branchCode: 'A73', shortName: 'AI&ML' } }),
    prisma.branch.upsert({ where: { code: '66-CSM' }, update: {}, create: { name: 'Computer Science & Engineering (AI&ML)', code: '66-CSM', branchCode: 'A66', shortName: 'CSM' } }),
    prisma.branch.upsert({ where: { code: '67-CSD' }, update: {}, create: { name: 'Computer Science & Engineering (Data Science)', code: '67-CSD', branchCode: 'A67', shortName: 'CSD' } }),
  ]);

  console.log(`✅ Created ${branches.length} branches`);

  // Create sections for CSE branch (2022 and 2023 batches)
  const cseBranch = branches.find(b => b.code === '05-CSE')!;
  const eceBranch = branches.find(b => b.code === '04-ECE')!;

  const sections = await Promise.all([
    prisma.section.upsert({ where: { name_branchId_batchYear: { name: 'A', branchId: cseBranch.id, batchYear: 2022 } }, update: {}, create: { name: 'A', branchId: cseBranch.id, batchYear: 2022 } }),
    prisma.section.upsert({ where: { name_branchId_batchYear: { name: 'B', branchId: cseBranch.id, batchYear: 2022 } }, update: {}, create: { name: 'B', branchId: cseBranch.id, batchYear: 2022 } }),
    prisma.section.upsert({ where: { name_branchId_batchYear: { name: 'C', branchId: cseBranch.id, batchYear: 2022 } }, update: {}, create: { name: 'C', branchId: cseBranch.id, batchYear: 2022 } }),
    prisma.section.upsert({ where: { name_branchId_batchYear: { name: 'A', branchId: cseBranch.id, batchYear: 2023 } }, update: {}, create: { name: 'A', branchId: cseBranch.id, batchYear: 2023 } }),
    prisma.section.upsert({ where: { name_branchId_batchYear: { name: 'B', branchId: cseBranch.id, batchYear: 2023 } }, update: {}, create: { name: 'B', branchId: cseBranch.id, batchYear: 2023 } }),
    prisma.section.upsert({ where: { name_branchId_batchYear: { name: 'A', branchId: eceBranch.id, batchYear: 2022 } }, update: {}, create: { name: 'A', branchId: eceBranch.id, batchYear: 2022 } }),
    prisma.section.upsert({ where: { name_branchId_batchYear: { name: 'B', branchId: eceBranch.id, batchYear: 2022 } }, update: {}, create: { name: 'B', branchId: eceBranch.id, batchYear: 2022 } }),
  ]);

  console.log(`✅ Created ${sections.length} sections`);

  // Create subjects for CSE
  const subjects = await Promise.all([
    prisma.subject.upsert({ where: { code: 'CS301' }, update: {}, create: { name: 'Data Structures', code: 'CS301', branchId: cseBranch.id, semester: 3, credits: 4 } }),
    prisma.subject.upsert({ where: { code: 'CS302' }, update: {}, create: { name: 'Database Management Systems', code: 'CS302', branchId: cseBranch.id, semester: 3, credits: 4 } }),
    prisma.subject.upsert({ where: { code: 'CS303' }, update: {}, create: { name: 'Computer Organization', code: 'CS303', branchId: cseBranch.id, semester: 3, credits: 3 } }),
    prisma.subject.upsert({ where: { code: 'CS304' }, update: {}, create: { name: 'Discrete Mathematics', code: 'CS304', branchId: cseBranch.id, semester: 3, credits: 3 } }),
    prisma.subject.upsert({ where: { code: 'CS305' }, update: {}, create: { name: 'Object Oriented Programming', code: 'CS305', branchId: cseBranch.id, semester: 3, credits: 4 } }),
    prisma.subject.upsert({ where: { code: 'CS401' }, update: {}, create: { name: 'Operating Systems', code: 'CS401', branchId: cseBranch.id, semester: 4, credits: 4 } }),
    prisma.subject.upsert({ where: { code: 'CS402' }, update: {}, create: { name: 'Design & Analysis of Algorithms', code: 'CS402', branchId: cseBranch.id, semester: 4, credits: 4 } }),
    prisma.subject.upsert({ where: { code: 'CS403' }, update: {}, create: { name: 'Software Engineering', code: 'CS403', branchId: cseBranch.id, semester: 4, credits: 3 } }),
  ]);

  console.log(`✅ Created ${subjects.length} subjects`);

  // Create Admin user
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@jbiet.edu.in',
      passwordHash: adminHash,
      role: "ADMIN",
      mustChangePassword: false,
    },
  });
  console.log('✅ Admin user created (admin / Admin@123)');

  // Create Faculty
  const facultyHash = await bcrypt.hash('Faculty@123', 12);
  const facultyUser = await prisma.user.upsert({
    where: { username: 'FAC001' },
    update: {},
    create: {
      username: 'FAC001',
      email: 'faculty1@jbiet.edu.in',
      passwordHash: facultyHash,
      role: "FACULTY",
      mustChangePassword: false,
    },
  });

  const faculty1 = await prisma.faculty.upsert({
    where: { employeeId: 'FAC001' },
    update: {},
    create: {
      userId: facultyUser.id,
      employeeId: 'FAC001',
      name: 'Dr. Rajesh Kumar',
      branchId: cseBranch.id,
      qualifications: 'Ph.D in Computer Science',
      designation: 'Associate Professor',
    },
  });
  console.log('✅ Faculty created (FAC001 / Faculty@123)');

  // Create Faculty Assignment
  await prisma.facultyAssignment.upsert({
    where: {
      facultyId_sectionId_subjectId_semester_academicYear: {
        facultyId: faculty1.id,
        sectionId: sections[0].id, // CSE A 2022
        subjectId: subjects[0].id, // Data Structures
        semester: 3,
        academicYear: '2023-2024',
      },
    },
    update: {},
    create: {
      facultyId: faculty1.id,
      sectionId: sections[0].id,
      subjectId: subjects[0].id,
      semester: 3,
      academicYear: '2023-2024',
      isClassTeacher: true,
    },
  });

  // Create sample students
  const studentHash = await bcrypt.hash('Student@123', 12);

  const studentNames = [
    'Anand Sharma', 'Priya Reddy', 'Karthik Rao', 'Sneha Gupta', 'Rahul Verma',
    'Deepika Patel', 'Arjun Nair', 'Lakshmi Iyer', 'Vikram Singh', 'Pooja Devi',
  ];

  for (let i = 0; i < studentNames.length; i++) {
    const rollNumber = `22671A05${(i + 1).toString().padStart(2, '0')}`;
    
    const user = await prisma.user.upsert({
      where: { username: rollNumber },
      update: {},
      create: {
        username: rollNumber,
        email: `${rollNumber.toLowerCase()}@jbiet.edu.in`,
        passwordHash: studentHash,
        role: "STUDENT",
        mustChangePassword: false,
      },
    });

    await prisma.student.upsert({
      where: { registrationNo: rollNumber },
      update: {},
      create: {
        userId: user.id,
        registrationNo: rollNumber,
        batch: '2022-2026',
        batchYear: 2022,
        branchId: cseBranch.id,
        sectionId: sections[0].id, // Section A
        branchCode: 'A05',
        name: studentNames[i],
        fatherName: `Father of ${studentNames[i]}`,
        motherName: `Mother of ${studentNames[i]}`,
        mobileNo: `98765${(43210 + i).toString()}`,
        dateOfBirth: new Date(2003, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: i % 3 === 0 ? "FEMALE" : "MALE",
        nationality: 'Indian',
        state: 'Telangana',
        regulation: 'R22',
        stream: 'Engineering',
        admissionCategory: i % 2 === 0 ? 'EAMCET' : 'Management',
      },
    });
  }
  console.log(`✅ Created ${studentNames.length} sample students (22671A0501-10 / Student@123)`);

  // Create fee records for students
  const allStudents = await prisma.student.findMany();
  for (const student of allStudents) {
    await prisma.feeRecord.upsert({
      where: { studentId_category_semester_academicYear: { studentId: student.id, category: "TUITION", semester: 3, academicYear: '2023-2024' } },
      update: {},
      create: { studentId: student.id, category: "TUITION", semester: 3, academicYear: '2023-2024', totalAmount: 75000, status: "UNPAID" },
    });
    await prisma.feeRecord.upsert({
      where: { studentId_category_semester_academicYear: { studentId: student.id, category: "EXAM", semester: 3, academicYear: '2023-2024' } },
      update: {},
      create: { studentId: student.id, category: "EXAM", semester: 3, academicYear: '2023-2024', totalAmount: 2000, status: "UNPAID" },
    });
    await prisma.feeRecord.upsert({
      where: { studentId_category_semester_academicYear: { studentId: student.id, category: "BUS", semester: 3, academicYear: '2023-2024' } },
      update: {},
      create: { studentId: student.id, category: "BUS", semester: 3, academicYear: '2023-2024', totalAmount: 25000, status: "UNPAID" },
    });
  }
  console.log('✅ Created fee records for all students');

  // Create semester results for first few students
  for (let i = 0; i < 5; i++) {
    const student = allStudents[i];
    const semResult = await prisma.semesterResult.upsert({
      where: { studentId_semester_academicYear: { studentId: student.id, semester: 3, academicYear: '2023-2024' } },
      update: {},
      create: { studentId: student.id, semester: 3, academicYear: '2023-2024', sgpa: 7.5 + Math.random() * 2, cgpa: 7.2 + Math.random() * 2, totalCredits: 18, earnedCredits: 18 },
    });

    for (const subject of subjects.slice(0, 5)) {
      const internal = Math.floor(Math.random() * 10) + 20;
      const external = Math.floor(Math.random() * 30) + 35;
      await prisma.subjectResult.upsert({
        where: { semesterResultId_subjectId: { semesterResultId: semResult.id, subjectId: subject.id } },
        update: {},
        create: {
          semesterResultId: semResult.id,
          subjectId: subject.id,
          internalMarks: internal,
          externalMarks: external,
          totalMarks: internal + external,
          grade: internal + external >= 80 ? 'A+' : internal + external >= 70 ? 'A' : internal + external >= 60 ? 'B+' : 'B',
          gradePoints: internal + external >= 80 ? 10 : internal + external >= 70 ? 9 : internal + external >= 60 ? 8 : 7,
          credits: subject.credits,
          isBacklog: false,
        },
      });
    }
  }
  console.log('✅ Created sample results');

  // Create attendance records
  const today = new Date();
  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

    for (let i = 0; i < Math.min(5, allStudents.length); i++) {
      await prisma.attendance.upsert({
        where: { studentId_subjectId_date: { studentId: allStudents[i].id, subjectId: subjects[0].id, date } },
        update: {},
        create: {
          studentId: allStudents[i].id,
          subjectId: subjects[0].id,
          sectionId: sections[0].id,
          date,
          status: Math.random() > 0.2 ? 'PRESENT' : 'ABSENT',
          markedById: facultyUser.id,
          semester: 3,
          academicYear: '2023-2024',
        },
      });
    }
  }
  console.log('✅ Created attendance records');

  // Create Accountant user
  const accHash = await bcrypt.hash('Account@123', 12);
  await prisma.user.upsert({
    where: { username: 'accountant1' },
    update: {},
    create: { username: 'accountant1', email: 'accounts@jbiet.edu.in', passwordHash: accHash, role: "ACCOUNTANT", mustChangePassword: false },
  });
  console.log('✅ Accountant created (accountant1 / Account@123)');

  // Create Bus Provider user
  const busHash = await bcrypt.hash('BusProv@123', 12);
  await prisma.user.upsert({
    where: { username: 'busadmin' },
    update: {},
    create: { username: 'busadmin', email: 'transport@jbiet.edu.in', passwordHash: busHash, role: "BUS_PROVIDER", mustChangePassword: false },
  });
  console.log('✅ Bus Provider created (busadmin / BusProv@123)');

  // Create sample notices
  const noticesData = [
    { title: 'Time Table of I B.Tech II Sem Regular Examinations, June-2026', isNew: true, createdById: adminUser.id },
    { title: 'Notification for IV B.Tech II Sem (R18) Supplementary Examinations', isNew: true, createdById: adminUser.id },
    { title: 'Results of III B.Tech I Sem (R22) Regular Examinations, Dec-2025', createdById: adminUser.id },
    { title: 'Fee Payment Deadline Extended for I B.Tech Students', isNew: true, createdById: adminUser.id },
    { title: 'Workshop on Machine Learning - Registration Open', createdById: adminUser.id },
  ];

  for (const notice of noticesData) {
    await prisma.publicNotice.create({ data: notice });
  }
  console.log('✅ Created sample notices');

  console.log('\n🎉 Seeding complete!\n');
  console.log('Test Accounts:');
  console.log('  Admin:        admin / Admin@123');
  console.log('  Faculty:      FAC001 / Faculty@123');
  console.log('  Students:     22671A0501 to 22671A0510 / Student@123');
  console.log('  Accountant:   accountant1 / Account@123');
  console.log('  Bus Provider: busadmin / BusProv@123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

