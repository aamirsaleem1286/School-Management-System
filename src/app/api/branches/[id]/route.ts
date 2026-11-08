import { NextResponse } from "next/server";
import { z } from "zod";
import { Branch } from "@/models";
import { fail, handleError, requireApi } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

const branchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApi("settings.update");
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    const input = branchSchema.parse(await req.json());
    const doc = await Branch.findOneAndUpdate(
      { _id: id, organizationId: auth.user.organizationId },
      { $set: input },
      { new: true, runValidators: true }
    );
    if (!doc) return fail("Branch not found", 404);
    await recordAudit({
      organizationId: auth.user.organizationId,
      userId: auth.user.id,
      userName: auth.user.name,
      action: "update",
      entity: "Branch",
      entityId: String(doc._id),
      description: `Updated branch ${doc.name}`,
    });
    return NextResponse.json({ ok: true, message: "Branch updated" });
  } catch (err) {
    return handleError(err);
  }
}
