import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!email || !token || password.length < 6) {
    return NextResponse.json({ error: "Email, token and a password of at least 6 characters are required" }, { status: 400 });
  }

  const user = await User.findOne({
    email,
    resetTokenExpires: { $gt: new Date() },
  }).select("+resetToken +resetTokenExpires");

  if (!user || !user.resetToken) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }
  const valid = await bcrypt.compare(token, user.resetToken);
  if (!valid) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetToken = null;
  user.resetTokenExpires = null;
  await user.save();

  return NextResponse.json({ ok: true, message: "Password updated. You can now sign in." });
}
