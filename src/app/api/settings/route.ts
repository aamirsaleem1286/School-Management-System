import { NextResponse } from "next/server";
import { Branch, Organization } from "@/models";
import { handleError, requireApi } from "@/lib/api";
import { settingsSchema } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  try {
    const auth = await requireApi("settings.view");
    if (auth.error) return auth.error;
    const [organization, branches] = await Promise.all([
      Organization.findById(auth.user.organizationId).lean(),
      Branch.find({ organizationId: auth.user.organizationId }).sort({ name: 1 }).lean(),
    ]);
    return NextResponse.json({ data: { organization, branches } });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireApi("settings.update");
    if (auth.error) return auth.error;
    const input = settingsSchema.parse(await req.json());
    const update: Record<string, unknown> = {};
    for (const key of ["name", "email", "phone", "address", "city", "country", "currency", "locale", "timezone", "logo", "primaryColor"]) {
      if (input[key as keyof typeof input] !== undefined) update[key] = input[key as keyof typeof input];
    }
    if (input.modules !== undefined) update["settings.modules"] = input.modules;
    if (input.lateFeePerDay !== undefined) update["settings.lateFeePerDay"] = input.lateFeePerDay;
    const organization = await Organization.findByIdAndUpdate(auth.user.organizationId, { $set: update }, { new: true });
    await recordAudit({
      organizationId: auth.user.organizationId,
      branchId: auth.user.activeBranchId,
      userId: auth.user.id,
      userName: auth.user.name,
      action: "update",
      entity: "Settings",
      description: "Updated organization settings",
    });
    return NextResponse.json({ ok: true, data: organization, message: "Settings saved" });
  } catch (err) {
    return handleError(err);
  }
}
