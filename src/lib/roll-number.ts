import { prisma } from './prisma';

/**
 * Generate JBIET roll number in format: YYCCCBBnnnn
 * YY = last 2 digits of batch year (e.g. 22 for 2022)
 * CCC = college code (671)
 * BB = branch code (e.g. A05 for CSE)
 * nnnn = sequential number padded to 2 digits minimum
 * 
 * Example: 22671A0501, 22671A0502, ...
 */
export async function generateRollNumber(batchYear: number, branchCode: string): Promise<string> {
  const yearPrefix = batchYear.toString().slice(-2); // "22" from 2022
  const collegeCode = '671';
  const prefix = `${yearPrefix}${collegeCode}${branchCode}`;

  // Find the highest existing roll number with this prefix
  const lastStudent = await prisma.student.findFirst({
    where: {
      registrationNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      registrationNo: 'desc',
    },
    select: {
      registrationNo: true,
    },
  });

  let nextNumber = 1;
  if (lastStudent) {
    const lastNumberStr = lastStudent.registrationNo.slice(prefix.length);
    const lastNumber = parseInt(lastNumberStr, 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Pad to at least 2 digits
  const numberStr = nextNumber.toString().padStart(2, '0');
  return `${prefix}${numberStr}`;
}
