import { NextResponse } from "next/server";
import { requireApi, handleError } from "@/lib/api";
import { Notification } from "@/models";

export async function POST() {
  try {
    const auth = await requireApi();
    if (auth.error) return auth.error;
    await Notification.updateMany(
      { userId: auth.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
