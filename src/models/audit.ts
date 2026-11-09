import { Schema } from "@/lib/pgdb";
import { baseOptions, getModel, ref } from "./helpers";

const auditLogSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), default: null, index: true },
    userId: { ...ref("User"), default: null, index: true },
    userName: { type: String, default: "" },
    userRole: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, default: "" },
    description: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  baseOptions
);
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ branchId: 1, createdAt: -1 });

export const AuditLog = getModel("AuditLog", auditLogSchema);
