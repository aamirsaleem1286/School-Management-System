import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import { getSessionUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { BRANCH_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const branchId = body.branchId ? String(body.branchId) : null;
  const store = await cookies();

  if (user.role === "super_admin") {
    if (branchId) store.set(BRANCH_COOKIE, branchId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    else store.delete(BRANCH_COOKIE);
    await recordAudit({
      organizationId: user.organizationId,
      branchId,
      userId: user.id,
      userName: user.name,
      action: "switch_branch",
      entity: "Branch",
      entityId: branchId || "all",
      description: "Switched active branch",
    });
    return NextResponse.json({ ok: true });
  }

  if (!branchId || !user.branchId) {
    return NextResponse.json({ error: "Branch switching is not allowed" }, { status: 403 });
  }
  await dbConnect();
  const target = await User.findOne({ _id: user.id, organizationId: user.organizationId }).lean();
  if (!target) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ error: "Branch switching is not allowed" }, { status: 403 });
}
