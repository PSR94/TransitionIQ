import { db, auditLogsTable } from "@workspace/db";
import type { AuthUser } from "./auth";

export async function logAudit(
  user: AuthUser | null,
  action: string,
  resourceType?: string,
  resourceId?: number,
  details?: string
): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      action,
      resourceType: resourceType ?? null,
      resourceId: resourceId ?? null,
      details: details ?? null,
    });
  } catch {
    // Never throw from audit logging
  }
}
