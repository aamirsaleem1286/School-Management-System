import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  GraduationCap,
  Megaphone,
  Receipt,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { scopeFilter } from "@/lib/auth";
import {
  Announcement,
  Admission,
  Attendance,
  Employee,
  Event,
  Exam,
  Expense,
  Invoice,
  Payment,
  SchoolClass,
  Student,
} from "@/models";
import { formatCurrency, formatDate, formatDateTime, monthKey, percent, startOfDay, endOfDay } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AttendanceChart, ClassChart, CollectionChart, ExpensePie } from "@/components/dashboard/charts";

export const dynamic = "force-dynamic";

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "parent" || user.role === "student") redirect("/portal");
  await dbConnect();

  const scope = scopeFilter(user);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    activeStudents,
    activeStaff,
    attendanceToday,
    collectionThisMonth,
    collectionLastMonth,
    duesAgg,
    pendingAdmissions,
    upcomingExam,
    monthPayments,
    attendanceTrend,
    classDist,
    expenseBreakdown,
    recentPayments,
    recentAdmissions,
    upcomingEvents,
    announcements,
  ] = await Promise.all([
    Student.countDocuments({ ...scope, status: "active" }),
    Employee.countDocuments({ ...scope, status: "active" }),
    Attendance.aggregate([
      { $match: { ...scope, personType: "student", date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { ...scope, paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: { ...scope, paidAt: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Invoice.aggregate([
      { $match: { ...scope, status: { $in: ["unpaid", "partial", "overdue"] } } },
      { $group: { _id: null, total: { $sum: "$balance" }, count: { $sum: 1 } } },
    ]),
    Admission.countDocuments({ ...scope, status: { $in: ["pending", "under_review", "waitlisted"] } }),
    Exam.findOne({ ...scope, status: "scheduled", startDate: { $gte: now } }).sort({ startDate: 1 }).lean(),
    Payment.aggregate([
      { $match: { ...scope, paidAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Attendance.aggregate([
      { $match: { ...scope, personType: "student", date: { $gte: sevenDaysAgo, $lte: todayEnd } } },
      {
        $group: {
          _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]),
    Student.aggregate([
      { $match: { ...scope, status: "active", classId: { $ne: null } } },
      { $group: { _id: "$classId", students: { $sum: 1 } } },
      { $sort: { students: -1 } },
      { $limit: 8 },
    ]),
    Expense.aggregate([
      { $match: { ...scope, date: { $gte: new Date(now.getFullYear(), 0, 1) } } },
      { $group: { _id: "$category", value: { $sum: "$amount" } } },
      { $sort: { value: -1 } },
      { $limit: 7 },
    ]),
    Payment.find(scope)
      .sort({ paidAt: -1 })
      .limit(6)
      .populate("studentId", "firstName lastName admissionNo")
      .lean(),
    Admission.find(scope).sort({ createdAt: -1 }).limit(5).lean(),
    Event.find({ ...scope, endDate: { $gte: now } }).sort({ startDate: 1 }).limit(4).lean(),
    Announcement.find({ ...scope, status: "published" }).sort({ publishedAt: -1 }).limit(3).lean(),
  ]);

  const attendanceMap = Object.fromEntries(attendanceToday.map((a: any) => [a._id, a.count]));
  const presentToday = attendanceMap.present || 0;
  const lateToday = attendanceMap.late || 0;
  const absentToday = attendanceMap.absent || 0;
  const markedToday = presentToday + lateToday + absentToday + (attendanceMap.leave || 0);
  const attendanceRate = percent(presentToday + lateToday, markedToday || activeStudents);

  const collected = collectionThisMonth[0]?.total || 0;
  const collectedLast = collectionLastMonth[0]?.total || 0;
  const collectionTrend = collectedLast ? Math.round(((collected - collectedLast) / collectedLast) * 100) : 0;
  const dues = duesAgg[0]?.total || 0;
  const dueInvoices = duesAgg[0]?.count || 0;

  const monthMap = Object.fromEntries(monthPayments.map((m: any) => [m._id, m.amount]));
  const collectionSeries = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { month: monthLabel(key), amount: monthMap[key] || 0 };
  });

  const trendMap: Record<string, { present: number; absent: number; late: number }> = {};
  for (const row of attendanceTrend as any[]) {
    trendMap[row._id.day] = trendMap[row._id.day] || { present: 0, absent: 0, late: 0 };
    if (row._id.status === "present") trendMap[row._id.day].present = row.count;
    if (row._id.status === "absent") trendMap[row._id.day].absent = row.count;
    if (row._id.status === "late") trendMap[row._id.day].late = row.count;
  }
  const attendanceSeries = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(sevenDaysAgo.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      ...(trendMap[key] || { present: 0, absent: 0, late: 0 }),
    };
  });

  const classIds = (classDist as any[]).map((c) => c._id);
  const classes = await SchoolClass.find({ _id: { $in: classIds } }).select("name").lean();
  const classNameMap = Object.fromEntries(classes.map((c: any) => [String(c._id), c.name]));
  const classSeries = (classDist as any[]).map((c) => ({ name: classNameMap[String(c._id)] || "Class", students: c.students }));
  const expenseSeries = (expenseBreakdown as any[]).map((e) => ({ name: e._id || "Other", value: e.value }));

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        description={`Here is what is happening across your school today · ${formatDate(now, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
      >
        <Button asChild variant="outline">
          <Link href="/fees/payments">
            <CreditCard className="h-4 w-4" /> Collect fee
          </Link>
        </Button>
        <Button asChild>
          <Link href="/students">
            <UserPlus className="h-4 w-4" /> Add student
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active students" value={activeStudents.toLocaleString()} icon={GraduationCap} tone="secondary" hint="Enrolled this session" />
        <StatCard
          label="Collected this month"
          value={formatCurrency(collected)}
          icon={Wallet}
          tone="success"
          trend={{ value: `${collectionTrend >= 0 ? "+" : ""}${collectionTrend}%`, positive: collectionTrend >= 0 }}
          hint="vs last month"
        />
        <StatCard
          label="Outstanding dues"
          value={formatCurrency(dues)}
          icon={Receipt}
          tone="destructive"
          hint={`${dueInvoices} open invoices`}
        />
        <StatCard
          label="Attendance today"
          value={`${attendanceRate}%`}
          icon={BadgeCheck}
          tone={attendanceRate >= 85 ? "success" : attendanceRate >= 70 ? "warning" : "destructive"}
          hint={`${absentToday} absent · ${lateToday} late`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Staff on record" value={activeStaff.toLocaleString()} icon={Users} tone="info" hint="Active employees" />
        <StatCard label="Pending admissions" value={pendingAdmissions.toLocaleString()} icon={UserPlus} tone="warning" hint="Awaiting review" />
        <StatCard
          label="Next examination"
          value={upcomingExam ? formatDate(upcomingExam.startDate, { day: "2-digit", month: "short" }) : "—"}
          icon={CalendarClock}
          tone="accent"
          hint={upcomingExam ? upcomingExam.name : "No exam scheduled"}
        />
        <StatCard
          label="Fee marked today"
          value={markedToday.toLocaleString()}
          icon={Users}
          tone="primary"
          hint={`${presentToday} present of ${activeStudents} enrolled`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Fee collection</CardTitle>
              <CardDescription>Payments received over the last six months</CardDescription>
            </div>
            <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
              {formatCurrency(collected)} this month
            </span>
          </CardHeader>
          <CardContent>
            <CollectionChart data={collectionSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s attendance</CardTitle>
            <CardDescription>Student register snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display text-3xl font-semibold">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">present or late</p>
              </div>
              <span className="rounded-lg bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">{markedToday} marked</span>
            </div>
            <Progress value={attendanceRate} />
            <div className="space-y-2.5">
              {[
                { label: "Present", value: presentToday, tone: "bg-success" },
                { label: "Late", value: lateToday, tone: "bg-warning" },
                { label: "Absent", value: absentToday, tone: "bg-destructive" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2 text-xs">
                  <span className={`h-2 w-2 rounded-full ${row.tone}`} />
                  <span className="flex-1 text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                  <span className="w-10 text-right text-muted-foreground">{percent(row.value, markedToday || 1)}%</span>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/attendance">
                Open attendance <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance trend</CardTitle>
            <CardDescription>Last seven days across all classes</CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={attendanceSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Students by class</CardTitle>
            <CardDescription>Largest classes by enrolment</CardDescription>
          </CardHeader>
          <CardContent>
            {classSeries.length ? <ClassChart data={classSeries} /> : <p className="py-20 text-center text-xs text-muted-foreground">No class data yet</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">Recent payments</h3>
            <Link href="/fees/payments" className="text-xs font-medium text-secondary hover:underline">
              View all
            </Link>
          </div>
          <DataTable
            headers={["Receipt", "Student", "Method", "Date", "Amount"]}
            rows={(recentPayments as any[]).map((p) => [
              <span key="r" className="font-mono text-xs">{p.receiptNo}</span>,
              <span key="s" className="text-sm">
                {p.studentId ? `${p.studentId.firstName} ${p.studentId.lastName}` : "—"}
              </span>,
              <span key="m" className="capitalize text-xs text-muted-foreground">{String(p.method).replace("_", " ")}</span>,
              <span key="d" className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</span>,
              <span key="a" className="font-semibold">{formatCurrency(p.amount)}</span>,
            ])}
            empty="No payments recorded yet"
            emptyHint="Payments will appear here as soon as fees are collected."
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense mix</CardTitle>
            <CardDescription>Year to date by category</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseSeries.length ? <ExpensePie data={expenseSeries} /> : <p className="py-20 text-center text-xs text-muted-foreground">No expenses recorded</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Latest admissions</CardTitle>
            <Link href="/admissions" className="text-xs font-medium text-secondary hover:underline">
              View
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(recentAdmissions as any[]).length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No applications yet</p>
            ) : (
              (recentAdmissions as any[]).map((a) => (
                <div key={String(a._id)} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">
                      {a.firstName} {a.lastName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{a.applicationNo}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Upcoming events</CardTitle>
            <Link href="/events" className="text-xs font-medium text-secondary hover:underline">
              Calendar
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(upcomingEvents as any[]).length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Nothing scheduled</p>
            ) : (
              (upcomingEvents as any[]).map((e) => (
                <div key={String(e._id)} className="flex gap-3 rounded-lg border p-2.5">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <span className="text-[10px] font-semibold uppercase">{new Date(e.startDate).toLocaleDateString("en-US", { month: "short" })}</span>
                    <span className="text-sm font-bold leading-none">{new Date(e.startDate).getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{e.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{e.location || "School campus"}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Megaphone className="h-3.5 w-3.5 text-secondary" /> Announcements
            </CardTitle>
            <Link href="/announcements" className="text-xs font-medium text-secondary hover:underline">
              All
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(announcements as any[]).length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No announcements</p>
            ) : (
              (announcements as any[]).map((a) => (
                <div key={String(a._id)} className="rounded-lg border p-2.5">
                  <p className="line-clamp-1 text-xs font-semibold">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{a.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(a.publishedAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="pb-2 text-center text-[11px] text-muted-foreground">
        Showing data for {user.activeBranchId ? "the selected branch" : "all branches"} · {monthKey(now)}
      </p>
    </div>
  );
}
