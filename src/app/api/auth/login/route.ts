import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { env } from "@/lib/env";
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (user.status !== "active") {
      return NextResponse.json({ error: "This account is not active. Contact your administrator." }, { status: 403 });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = await createSessionToken({
      userId: String(user._id),
      role: user.role,
      organizationId: String(user.organizationId),
      branchId: user.branchId ? String(user.branchId) : null,
      name: user.name,
      email: user.email,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: env.AUTH_SESSION_TTL,
    });
    store.delete("sms_branch");

    await recordAudit({
      organizationId: String(user.organizationId),
      branchId: user.branchId ? String(user.branchId) : null,
      userId: String(user._id),
      userName: user.name,
      action: "login",
      entity: "User",
      entityId: String(user._id),
      description: `${user.name} signed in`,
    });

    return NextResponse.json({ ok: true, role: user.role });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Unable to sign in right now. Please try again." }, { status: 500 });
  }
}
