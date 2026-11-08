import "server-only";
import { env } from "./env";
import { Notification } from "@/models";

type NotifyInput = {
  organizationId: string;
  branchId?: string | null;
  userId: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
  email?: string;
  phone?: string;
  channels?: ("in_app" | "email" | "whatsapp" | "sms")[];
};

export async function notify(input: NotifyInput) {
  const channels = input.channels || ["in_app"];
  const created = await Notification.create({
    organizationId: input.organizationId,
    branchId: input.branchId ?? null,
    userId: input.userId,
    title: input.title,
    body: input.body || "",
    type: input.type || "info",
    link: input.link || "",
  });

  if (channels.includes("email") && input.email) {
    await sendEmail(input.email, input.title, input.body || "").catch((e) =>
      console.error("[notify:email]", e)
    );
  }
  if (channels.includes("whatsapp") && input.phone) {
    await sendWhatsApp(input.phone, `${input.title}\n${input.body || ""}`).catch((e) =>
      console.error("[notify:whatsapp]", e)
    );
  }
  return created;
}

export async function sendEmail(to: string, subject: string, text: string) {
  if (!env.SMTP.host) {
    console.log(`[email:not-configured] to=${to} subject=${subject}`);
    return { delivered: false, reason: "SMTP not configured" };
  }
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: env.SMTP.host,
    port: env.SMTP.port,
    secure: env.SMTP.secure,
    auth: env.SMTP.user ? { user: env.SMTP.user, pass: env.SMTP.pass } : undefined,
  });
  await transporter.sendMail({ from: env.SMTP.from, to, subject, text });
  return { delivered: true };
}

export async function sendWhatsApp(to: string, message: string) {
  if (!env.WHATSAPP.token || !env.WHATSAPP.phoneNumberId) {
    console.log(`[whatsapp:not-configured] to=${to}`);
    return { delivered: false, reason: "WhatsApp API not configured" };
  }
  const url = `https://graph.facebook.com/${env.WHATSAPP.version}/${env.WHATSAPP.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });
  return { delivered: res.ok };
}

export async function sendSms(to: string, message: string) {
  if (!env.SMS.url) {
    console.log(`[sms:not-configured] to=${to}`);
    return { delivered: false, reason: "SMS gateway not configured" };
  }
  const res = await fetch(env.SMS.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SMS.key}` },
    body: JSON.stringify({ to, message, sender: env.SMS.sender }),
  });
  return { delivered: res.ok };
}

export async function notifyAbsence(opts: {
  organizationId: string;
  branchId: string;
  guardianUserId?: string | null;
  guardianPhone?: string;
  studentName: string;
  date: string;
}) {
  if (!opts.guardianUserId) return;
  await notify({
    organizationId: opts.organizationId,
    branchId: opts.branchId,
    userId: opts.guardianUserId,
    title: `Absence alert: ${opts.studentName}`,
    body: `${opts.studentName} was marked absent on ${opts.date}. Please contact the school if this is unexpected.`,
    type: "warning",
    phone: opts.guardianPhone,
    channels: opts.guardianPhone ? ["in_app", "whatsapp"] : ["in_app"],
  });
}
