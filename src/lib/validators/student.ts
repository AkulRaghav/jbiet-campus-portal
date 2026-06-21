import { z } from 'zod';

export const createStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  fatherName: z.string().max(100).optional(),
  motherName: z.string().max(100).optional(),
  email: z.string().email('Invalid email address'),
  mobileNo: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number').optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  nationality: z.string().max(50).optional(),
  caste: z.string().max(50).optional(),
  aadharNo: z.string().regex(/^\d{12}$/, 'Aadhar must be 12 digits').optional(),
  isScholarshipHolder: z.boolean().optional(),
  scholarshipAmount: z.number().min(0).optional(),
  state: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
  parentMobileNo: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number').optional(),
  religion: z.string().max(50).optional(),
  moleIdentification1: z.string().max(200).optional(),
  moleIdentification2: z.string().max(200).optional(),
  
  // Academic
  batchYear: z.number().min(2000).max(2100),
  branchId: z.string().min(1, 'Branch is required'),
  sectionId: z.string().min(1, 'Section is required'),
  regulation: z.string().max(10).optional(),
  stream: z.string().max(50).optional(),
  admissionCategory: z.string().max(50).optional(),
  admissionNumber: z.string().max(50).optional(),
  dateOfAdmission: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
