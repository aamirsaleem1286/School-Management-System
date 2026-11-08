import { BarChart3, BookOpenCheck, Download, Receipt, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { Attendance, Employee, Expense, Invoice, Payment, Student } from "@/models";
import { branchScope } from "@/lib/api";
import { requirePage } from "@/lib/page";
import { formatCurrency, formatNumber, monthKey, percent, startOfDay, endOfDay } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const EXPORTS = [
  { href: "/api/exports/students", label: "Students" },
  { href: "/api/exports/invoices", label: "Fee invoices" },
  { href: "/api/exports/payments", label: "Fee payments" },
  { href: "/api/exports/employees", label: "Employees" },
  { href: "/api/exports/expenses", label: "Expenses" },
  { href: "/api/exports/attendance", label: "Attendance" },
  { href: "/api/exports/inventory", label: "Inventory" },
  { href: "/api/exports/visitors", label: "Visitors" },
  { href: "/api/exports/marks", label: "Exam marks" },
];

export default async function ReportsPage() {
  const user = await requirePage("reports.view");
  const scope = branchScope(user);
  const today = { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) };

  const [students, employees, invoiceAgg, paymentAgg, expenseAgg, attendanceToday] = await Promise.all([
    Student.countDocuments({ ...scope, status: "active" }),
    Employee.countDocuments({ ...scope, employmentStatus: "active" }),
    Invoice.aggregate([
      { $match: scope },
      { $group: { _id: null, billed: { $sum: "$totalAmount" }, paid: { $sum: "$paidAmount" }, balance: { $sum: "$balance" } } },
    ]),
    Payment.aggregate([{ $match: scope }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Expense.aggregate([{ $match: scope }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Attendance.aggregate([
      { $match: { ...scope, date: today } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const billed = invoiceAgg[0]?.billed || 0;
  const collected = paymentAgg[0]?.total || 0;
  const outstanding = invoiceAgg[0]?.balance || 0;
  const expenses = expenseAgg[0]?.total || 0;
  const attendanceTotal = attendanceToday.reduce((s: number, r: any) => s + r.count, 0);
  const presentCount = attendanceToday.filter((r: any) => r.status === "present" || r.status === "late").reduce((s: number, r: any) => s + r.count, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Key school-wide metrics and data exports." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active students" value={formatNumber(students)} icon={Users} tone="secondary" />
        <StatCard label="Active employees" value={formatNumber(employees)} icon={BookOpenCheck} tone="accent" />
        <StatCard label="Collected revenue" value={formatCurrency(collected)} icon={TrendingUp} tone="success" />
        <StatCard label="Total expenses" value={formatCurrency(expenses)} icon={TrendingDown} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-4 w-4 text-muted-foreground" /> Fee summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Billed</span><span className="font-medium">{formatCurrency(billed)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Collected</span><span className="font-medium text-success">{formatCurrency(collected)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-medium text-warning">{formatCurrency(outstanding)}</span></div>
            <div className="flex justify-between border-t border-border pt-3"><span className="text-muted-foreground">Collection rate</span><span className="font-semibold">{percent(collected, billed || 1)}%</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-muted-foreground" /> Attendance today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {attendanceTotal === 0 ? (
              <p className="text-muted-foreground">No attendance marked today.</p>
            ) : (
              attendanceToday.map((r: any) => (
                <div key={r._id} className="flex justify-between capitalize">
                  <span className="text-muted-foreground">{r._id}</span>
                  <span className="font-medium">{formatNumber(r.count)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Attendance rate</span>
              <span className="font-semibold">{attendanceTotal ? percent(presentCount, attendanceTotal) : 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-muted-foreground" /> Net position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Revenue collected</span><span className="font-medium">{formatCurrency(collected)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span className="font-medium">{formatCurrency(expenses)}</span></div>
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Net</span>
              <span className={`font-semibold ${collected - expenses >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(collected - expenses)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Period: {monthKey(new Date())}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Download className="h-4 w-4 text-muted-foreground" /> Export data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {EXPORTS.map((e) => (
            <Button key={e.href} asChild variant="outline" size="sm"><a href={e.href}>{e.label}</a></Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
