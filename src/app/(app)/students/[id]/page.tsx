import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck2, Mail, Phone, Receipt, UserRound } from "lucide-react";
import { Attendance, Invoice, Payment, Student } from "@/models";
import { branchScope } from "@/lib/api";
import { requirePage } from "@/lib/page";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { DeleteButton } from "@/components/shared/delete-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("students.view");
  const { id } = await params;
  const student: any = await Student.findOne({ _id: id, ...branchScope(user) })
    .populate("classId", "name")
    .populate("sectionId", "name")
    .lean();
  if (!student) notFound();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [attendance, presentCount, absentCount, invoices, payments, outstanding] = await Promise.all([
    Attendance.find({ ...branchScope(user), personType: "student", personId: student._id }).sort({ date: -1 }).limit(10).lean(),
    Attendance.countDocuments({ ...branchScope(user), personType: "student", personId: student._id, status: "present", date: { $gte: monthStart } }),
    Attendance.countDocuments({ ...branchScope(user), personType: "student", personId: student._id, status: "absent", date: { $gte: monthStart } }),
    Invoice.find({ ...branchScope(user), studentId: student._id }).sort({ createdAt: -1 }).limit(6).lean(),
    Payment.find({ ...branchScope(user), studentId: student._id }).sort({ paidAt: -1 }).limit(6).lean(),
    Invoice.aggregate([
      { $match: { organizationId: student.organizationId, studentId: student._id, status: { $in: ["unpaid", "partial", "overdue"] } } },
      { $group: { _id: null, total: { $sum: "$balance" } } },
    ]),
  ]);

  const invoiceRows = invoices.map((inv: any) => [
    <Link key="no" href="/fees/invoices" className="font-medium hover:text-secondary">{inv.invoiceNo}</Link>,
    inv.month || inv.term || "-",
    formatCurrency(inv.total),
    formatCurrency(inv.paidAmount),
    formatCurrency(inv.balance),
    <StatusBadge key="status" status={inv.status} />,
    formatDate(inv.dueDate),
  ]);

  const paymentRows = payments.map((p: any) => [
    <span key="r" className="font-medium">{p.receiptNo}</span>,
    formatCurrency(p.amount),
    <span key="m" className="capitalize">{String(p.method).replace("_", " ")}</span>,
    p.reference || "-",
    formatDate(p.paidAt),
  ]);

  const attendanceRows = attendance.map((a: any) => [formatDate(a.date), <StatusBadge key="s" status={a.status} />, a.remarks || "-"]);

  return (
    <div className="space-y-5">
      <PageHeader title="Student profile" description={`${student.firstName} ${student.lastName} · ${student.admissionNo}`}>
        <Button asChild variant="outline" size="sm">
          <Link href="/students">
            <ArrowLeft className="h-4 w-4" /> Back to students
          </Link>
        </Button>
        <DeleteButton endpoint={`/api/students/${student._id}`} name={`${student.firstName} ${student.lastName}`} redirect="/students" label="Delete student" />
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-xl">{initials(`${student.firstName} ${student.lastName}`)}</AvatarFallback>
              </Avatar>
              <h2 className="mt-3 font-display text-lg font-semibold">
                {student.firstName} {student.lastName}
              </h2>
              <p className="text-xs text-muted-foreground">{student.admissionNo}</p>
              <div className="mt-2">
                <StatusBadge status={student.status} />
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Class</span>
                <span className="font-medium">{student.classId?.name || "-"}{student.sectionId?.name ? ` - ${student.sectionId.name}` : ""}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Roll no</span>
                <span className="font-medium">{student.rollNo || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gender</span>
                <span className="font-medium capitalize">{student.gender}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date of birth</span>
                <span className="font-medium">{formatDate(student.dob)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Admitted</span>
                <span className="font-medium">{formatDate(student.admissionDate)}</span>
              </div>
            </div>
            <div className="mt-5 rounded-xl border bg-muted/30 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" /> Guardian
              </p>
              <p className="mt-2 text-sm font-medium">{student.guardian?.guardianName || student.guardian?.fatherName || "Not provided"}</p>
              {student.guardian?.phone ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {student.guardian.phone}
                </p>
              ) : null}
              {student.guardian?.email ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> {student.guardian.email}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Present (month)" value={presentCount} icon={CalendarCheck2} tone="success" />
            <StatCard label="Absent (month)" value={absentCount} icon={CalendarCheck2} tone="destructive" />
            <StatCard label="Outstanding" value={formatCurrency(outstanding[0]?.total || 0)} icon={Receipt} tone="warning" />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                className="rounded-none border-0 shadow-none"
                headers={["Invoice", "Period", "Total", "Paid", "Balance", "Status", "Due"]}
                rows={invoiceRows}
                empty="No invoices for this student"
              />
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent payments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable className="rounded-none border-0 shadow-none" headers={["Receipt", "Amount", "Method", "Reference", "Date"]} rows={paymentRows} empty="No payments yet" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Attendance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable className="rounded-none border-0 shadow-none" headers={["Date", "Status", "Remarks"]} rows={attendanceRows} empty="No attendance records" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
