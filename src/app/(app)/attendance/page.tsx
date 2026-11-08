import { CalendarCheck2, UserCheck, UserMinus, Users } from "lucide-react";
import { Attendance } from "@/models";
import { branchScope } from "@/lib/api";
import { readParam, requirePage, type SearchParams } from "@/lib/page";
import { getClassOptions, getSectionOptions } from "@/lib/options";
import { endOfDay, formatDate, startOfDay } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { AttendanceMarker } from "@/components/attendance/attendance-marker";

export const dynamic = "force-dynamic";

export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("attendance.view");
  const params = await searchParams;
  const classId = readParam(params, "classId") || "";
  const sectionId = readParam(params, "sectionId") || "";
  const dateParam = readParam(params, "date");
  const date = dateParam ? new Date(dateParam) : new Date();

  const [classes, sections, todayPresent, todayAbsent, todayLate, recent] = await Promise.all([
    getClassOptions(user),
    getSectionOptions(user),
    Attendance.countDocuments({ ...branchScope(user), personType: "student", status: "present", date: { $gte: startOfDay(date), $lte: endOfDay(date) } }),
    Attendance.countDocuments({ ...branchScope(user), personType: "student", status: "absent", date: { $gte: startOfDay(date), $lte: endOfDay(date) } }),
    Attendance.countDocuments({ ...branchScope(user), personType: "student", status: "late", date: { $gte: startOfDay(date), $lte: endOfDay(date) } }),
    Attendance.find({ ...branchScope(user), personType: "student" })
      .populate("studentId", "firstName lastName admissionNo")
      .sort({ date: -1 })
      .limit(15)
      .lean(),
  ]);

  const rows = recent.map((a: any) => [
    formatDate(a.date),
    a.studentId ? `${a.studentId.firstName} ${a.studentId.lastName}` : "-",
    a.studentId?.admissionNo || "-",
    <StatusBadge key="s" status={a.status} />,
    a.remarks || "-",
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance" description="Mark daily attendance and review recent records." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Present · ${formatDate(date)}`} value={todayPresent} icon={UserCheck} tone="success" />
        <StatCard label="Absent" value={todayAbsent} icon={UserMinus} tone="destructive" />
        <StatCard label="Late" value={todayLate} icon={CalendarCheck2} tone="warning" />
        <StatCard label="Roster" value={todayPresent + todayAbsent + todayLate} icon={Users} tone="secondary" />
      </div>

      <AttendanceMarker classes={classes} sections={sections} initialClassId={classId} initialSectionId={sectionId} />

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Recent records</h2>
        <DataTable headers={["Date", "Student", "Admission no", "Status", "Remarks"]} rows={rows} empty="No attendance recorded yet" />
      </div>
    </div>
  );
}
