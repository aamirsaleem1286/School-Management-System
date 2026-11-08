import { NextResponse } from "next/server";
import { z } from "zod";
import { Branch } from "@/models";
import { fail, handleError, requireApi } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

const branchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const auth = await requireApi("settings.view");
    if (auth.error) return auth.error;
    const branches = await Branch.find({ organizationId: auth.user.organizationId }).sort({ name: 1 }).lean();
    return NextResponse.json({ data: branches });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApi("settings.update");
    if (auth.error) return auth.error;
    const input = branchSchema.parse(await req.json());
    const exists = await Branch.findOne({ organizationId: auth.user.organizationId, code: input.code.toUpperCase() }).lean();
    if (exists) return fail("A branch with this code already exists", 409);
    const doc = await Branch.create({ ...input, code: input.code.toUpperCase(), organizationId: auth.user.organizationId });
    await recordAudit({
      organizationId: auth.user.organizationId,
      userId: auth.user.id,
      userName: auth.user.name,
      action: "create",
      entity: "Branch",
      entityId: String(doc._id),
      description: `Created branch ${doc.name}`,
    });
    return NextResponse.json({ ok: true, message: "Branch created" }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
