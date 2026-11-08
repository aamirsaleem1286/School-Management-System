import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import { sendEmail } from "@/lib/notifications";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const user = await User.findOne({ email, status: "active" });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = await bcrypt.hash(token, 10);
    user.resetTokenExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();
    const resetUrl = `${env.APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const result = await sendEmail(
      email,
      "Reset your password",
      `Hello ${user.name},\n\nReset your password using this link (valid for 30 minutes):\n${resetUrl}`
    );
    if (!result.delivered && process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        ok: true,
        message: "SMTP is not configured. Use the development reset link below.",
        devResetUrl: resetUrl,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a password reset link has been sent.",
  });
}
