import { NextResponse } from "next/server";
import { LeaveRequest } from "@/models";
import { fail, handleError, requireApi } from "@/lib/api";
import { leaveReviewSchema } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApi("hr.update");
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    const input = leaveReviewSchema.parse(await req.json());
    const doc = await LeaveRequest.findOne({ _id: id, organizationId: auth.user.organizationId });
    if (!doc) return fail("Leave request not found", 404);
    doc.status = input.status;
    doc.remarks = input.remarks || "";
    doc.reviewedBy = auth.user.id as any;
    doc.reviewedAt = new Date();
    await doc.save();
    await recordAudit({
      organizationId: auth.user.organizationId,
      branchId: doc.branchId ? String(doc.branchId) : null,
      userId: auth.user.id,
      userName: auth.user.name,
      action: input.status,
      entity: "Leave request",
      entityId: String(doc._id),
      description: `Leave request ${input.status}`,
    });
    return NextResponse.json({ ok: true, message: `Leave request ${input.status}` });
  } catch (err) {
    return handleError(err);
  }
}
