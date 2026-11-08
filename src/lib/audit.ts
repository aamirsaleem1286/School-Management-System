import "server-only";
import { AuditLog } from "@/models";

type AuditInput = {
  organizationId: string;
  branchId?: string | null;
  userId: string;
  userName: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
};

export async function recordAudit(input: AuditInput) {
  try {
    await AuditLog.create({
      organizationId: input.organizationId,
      branchId: input.branchId || null,
      userId: input.userId,
      userName: input.userName,
      userRole: input.userRole || "",
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ? String(input.entityId) : "",
      description: input.description || "",
      metadata: input.metadata || {},
      ip: input.request?.headers.get("x-forwarded-for") || "",
      userAgent: input.request?.headers.get("user-agent") || "",
    });
  } catch (err) {
    console.error("[audit] failed to record", err);
  }
}
