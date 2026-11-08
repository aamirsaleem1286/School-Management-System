import Link from "next/link";
import { CalendarDays, GraduationCap, Megaphone, Receipt } from "lucide-react";
import { Announcement, Attendance, Invoice, Student } from "@/models";
import { requirePage } from "@/lib/page";
import { formatCurrency, formatDate, percent } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function monthWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export default async function PortalPage() {
  const user = await requirePage("portal.view");

  const students = await Student.find({
    organizationId: user.organizationId,
    $or: [{ userId: user.id }, { guardianUserIds: user.id }],
  })
    .populate("classId", "name")
    .populate("sectionId", "name")
    .lean();

  const { start, end } = monthWindow();
  const [announcements] = await Promise.all([
    Announcement.find({ organizationId: user.organizationId, status: "published", $or: [{ branchId: user.branchId }, { branchId: null }] })
      .sort({ publishedAt: -1 })
      .limit(4)
      .lean(),
  ]);

  const childData = await Promise.all(
    students.map(async (s: any) => {
      const [attendance, invoices] = await Promise.all([
        Attendance.aggregate([
          { $match: { organizationId: user.organizationId, personType: "student", personId: s._id, date: { $gte: start, $lte: end } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Invoice.find({ organizationId: user.organizationId, studentId: s._id }).sort({ dueDate: -1 }).limit(5).lean(),
      ]);
      const total = attendance.reduce((sum: number, r: any) => sum + r.count, 0);
      const present = attendance.filter((r: any) => r.status === "present" || r.status === "late").reduce((sum: number, r: any) => sum + r.count, 0);
      const outstanding = invoices.reduce((sum: number, i: any) => sum + (i.balance || 0), 0);
      return { student: s, attendanceRate: total ? percent(present, total) : null, invoices, outstanding };
    })
  );

  return (
    <div className="space-y-5">
      <PageHeader title="My portal" description="Your children's academics, attendance and fees at a glance." />

      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No student profiles are linked to your account yet. Contact the school office to link your child.</p>
            <Button asChild variant="outline" size="sm"><Link href="/dashboard">Back to dashboard</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {childData.map(({ student, attendanceRate, invoices, outstanding }) => (
            <Card key={String(student._id)}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{student.firstName} {student.lastName}</CardTitle>
                  <CardDescription>
                    {student.admissionNo} · {student.classId?.name || "-"}{student.sectionId?.name ? ` (${student.sectionId.name})` : ""}
                  </CardDescription>
                </div>
                <StatusBadge status={student.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Attendance</p>
                    <p className="mt-1 text-lg font-semibold">{attendanceRate === null ? "-" : `${attendanceRate}%`}</p>
                    <p className="text-[11px] text-muted-foreground">This month</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Receipt className="h-3.5 w-3.5" /> Outstanding</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(outstanding)}</p>
                    <p className="text-[11px] text-muted-foreground">{invoices.filter((i: any) => i.balance > 0).length} unpaid invoices</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent invoices</p>
                  {invoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No invoices yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {invoices.map((inv: any) => (
                        <li key={String(inv._id)} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{inv.invoiceNo}</p>
                            <p className="text-xs text-muted-foreground">Due {formatDate(inv.dueDate)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{formatCurrency(inv.balance)}</span>
                            <StatusBadge status={inv.status} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 text-muted-foreground" /> Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements right now.</p>
          ) : (
            announcements.map((a: any) => (
              <div key={String(a._id)} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{a.title}</p>
                  <Badge variant={a.priority === "urgent" ? "destructive" : a.priority === "high" ? "warning" : "muted"}>{a.priority}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(a.publishedAt)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
