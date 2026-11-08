import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { User } from "@/models";
import { buildPaginationMeta, fail, handleError, pagination, requireApi, searchRegex } from "@/lib/api";
import { userSchema } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const auth = await requireApi("settings.view");
    if (auth.error) return auth.error;
    const params = new URL(req.url).searchParams;
    const { page, limit, skip } = pagination(params);
    const filter: Record<string, unknown> = { organizationId: auth.user.organizationId };
    if (auth.user.activeBranchId) filter.branchId = auth.user.activeBranchId;
    const q = searchRegex(params.get("q"));
    if (q) filter.$or = [{ name: q }, { email: q }, { phone: q }];
    const role = params.get("role");
    if (role) filter.role = role;
    const status = params.get("status");
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      User.find(filter).select("-passwordHash").populate("branchId", "name code").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    return NextResponse.json({ data, meta: buildPaginationMeta(total, page, limit) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApi("settings.manage_users");
    if (auth.error) return auth.error;
    const input = userSchema.parse(await req.json());
    if (!input.password) return fail("A password is required for new users", 422);
    const email = input.email.toLowerCase().trim();
    const exists = await User.findOne({ email }).lean();
    if (exists) return fail("A user with this email already exists", 409);
    const branchId = input.branchId || auth.user.activeBranchId || auth.user.branchId || null;
    const doc = await User.create({
      name: input.name,
      email,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role,
      phone: input.phone || "",
      status: input.status || "active",
      organizationId: auth.user.organizationId,
      branchId,
      extraPermissions: input.extraPermissions || [],
      deniedPermissions: input.deniedPermissions || [],
    });
    await recordAudit({
      organizationId: auth.user.organizationId,
      branchId: branchId ? String(branchId) : null,
      userId: auth.user.id,
      userName: auth.user.name,
      action: "create",
      entity: "User",
      entityId: String(doc._id),
      description: `Created user ${email} (${input.role})`,
    });
    return NextResponse.json({ ok: true, message: "User created" }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
