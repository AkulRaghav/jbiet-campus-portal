import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Allowed file types with their MIME types
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  document: ['application/pdf'],
  presentation: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true, // Required for MinIO/local S3
});

export interface UploadResult {
  key: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export function validateFile(file: File | { size: number; type: string; name: string }): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }

  // Check MIME type against allowlist
  const allAllowed = Object.values(ALLOWED_FILE_TYPES).flat();
  if (!allAllowed.includes(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not allowed. Allowed types: PDF, JPEG, PNG, WebP, PPT/PPTX` };
  }

  return { valid: true };
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: string = 'uploads'
): Promise<UploadResult> {
  const extension = fileName.split('.').pop();
  const key = `${folder}/${uuidv4()}.${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return {
    key,
    url: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`,
    fileName,
    fileSize: buffer.length,
    mimeType,
  };
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    })
  );
}

// Mock storage for development when S3 is not configured
export class MockStorage {
  private files = new Map<string, Buffer>();

  async upload(buffer: Buffer, fileName: string, mimeType: string, folder: string = 'uploads'): Promise<UploadResult> {
    const extension = fileName.split('.').pop();
    const key = `${folder}/${uuidv4()}.${extension}`;
    this.files.set(key, buffer);

    console.log(`[MockStorage] File uploaded: ${key} (${buffer.length} bytes)`);

    return {
      key,
      url: `/api/files/${key}`,
      fileName,
      fileSize: buffer.length,
      mimeType,
    };
  }

  async getFile(key: string): Promise<Buffer | null> {
    return this.files.get(key) || null;
  }
}

export const mockStorage = new MockStorage();
