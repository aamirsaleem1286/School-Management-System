import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Organization, Branch, Notification } from "@/models";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  await dbConnect();

  const [org, branches, notifications] = await Promise.all([
    Organization.findById(user.organizationId).lean(),
    Branch.find({ organizationId: user.organizationId, isActive: true }).select("name code isMain").sort({ isMain: -1, name: 1 }).lean(),
    Notification.find({ userId: user.id, isRead: false })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
  ]);

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        permissions: user.permissions,
        activeBranchId: user.activeBranchId,
      }}
      branches={branches.map((b) => ({ id: String(b._id), name: b.name, code: b.code, isMain: !!b.isMain }))}
      notifications={notifications.map((n) => ({
        id: String(n._id),
        title: n.title,
        body: n.body || "",
        link: n.link || "",
        isRead: !!n.isRead,
        createdAt: new Date(n.createdAt).toISOString(),
      }))}
      organizationName={org?.name || "AI Solution IT"}
      academicYear={org?.settings?.academicYear || "2026-2027"}
    >
      {children}
    </AppShell>
  );
}
