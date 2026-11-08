import { NextResponse } from "next/server";
import { LeaveRequest } from "@/models";
import { branchScope, buildPaginationMeta, fail, handleError, pagination, requireApi } from "@/lib/api";
import { leaveSchema } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const auth = await requireApi("hr.view");
    if (auth.error) return auth.error;
    const params = new URL(req.url).searchParams;
    const { page, limit, skip } = pagination(params);
    const filter: Record<string, unknown> = branchScope(auth.user);
    const status = params.get("status");
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate("studentId", "firstName lastName admissionNo")
        .populate("employeeId", "firstName lastName employeeNo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LeaveRequest.countDocuments(filter),
    ]);
    return NextResponse.json({ data, meta: buildPaginationMeta(total, page, limit) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApi("hr.create");
    if (auth.error) return auth.error;
    const input = leaveSchema.parse(await req.json());
    const branchId = auth.user.activeBranchId || auth.user.branchId;
    if (!branchId) return fail("Select an active branch first", 400);
    const doc = await LeaveRequest.create({
      ...input,
      organizationId: auth.user.organizationId,
      branchId,
      personId: input.studentId || input.employeeId || null,
      status: "pending",
    });
    await recordAudit({
      organizationId: auth.user.organizationId,
      branchId,
      userId: auth.user.id,
      userName: auth.user.name,
      action: "create",
      entity: "Leave request",
      entityId: String(doc._id),
      description: `Leave request submitted`,
    });
    return NextResponse.json({ ok: true, data: doc, message: "Leave request submitted" }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
