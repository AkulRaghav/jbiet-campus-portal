import { prisma } from './prisma';

export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes: changes ? JSON.stringify(changes) : null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    // Audit logging should never break the main flow
    console.error('Audit log failed:', error);
  }
}
