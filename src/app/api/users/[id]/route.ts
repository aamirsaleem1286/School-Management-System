import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { User } from "@/models";
import { fail, handleError, requireApi } from "@/lib/api";
import { userSchema } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApi("settings.manage_users");
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    const input = userSchema.partial().parse(await req.json());
    const user = await User.findOne({ _id: id, organizationId: auth.user.organizationId }).select("+passwordHash");
    if (!user) return fail("User not found", 404);
    if (input.email) {
      const email = input.email.toLowerCase().trim();
      const exists = await User.findOne({ email, _id: { $ne: user._id } }).lean();
      if (exists) return fail("Another user already uses this email", 409);
      user.email = email;
    }
    if (input.name) user.name = input.name;
    if (input.role) user.role = input.role;
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.status) user.status = input.status;
    if (input.branchId !== undefined) user.branchId = (input.branchId || null) as any;
    if (input.extraPermissions) user.extraPermissions = input.extraPermissions;
    if (input.deniedPermissions) user.deniedPermissions = input.deniedPermissions;
    if (input.password) user.passwordHash = await bcrypt.hash(input.password, 10);
    await user.save();
    await recordAudit({
      organizationId: auth.user.organizationId,
      branchId: user.branchId ? String(user.branchId) : null,
      userId: auth.user.id,
      userName: auth.user.name,
      action: "update",
      entity: "User",
      entityId: String(user._id),
      description: `Updated user ${user.email}`,
    });
    return NextResponse.json({ ok: true, message: "User updated" });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApi("settings.manage_users");
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (id === auth.user.id) return fail("You cannot delete your own account", 409);
    const user = await User.findOneAndDelete({ _id: id, organizationId: auth.user.organizationId });
    if (!user) return fail("User not found", 404);
    await recordAudit({
      organizationId: auth.user.organizationId,
      branchId: user.branchId ? String(user.branchId) : null,
      userId: auth.user.id,
      userName: auth.user.name,
      action: "delete",
      entity: "User",
      entityId: String(user._id),
      description: `Deleted user ${user.email}`,
    });
    return NextResponse.json({ ok: true, message: "User deleted" });
  } catch (err) {
    return handleError(err);
  }
}
