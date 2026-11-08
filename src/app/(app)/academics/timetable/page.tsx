import { CalendarDays, Clock3, Layers } from "lucide-react";
import { Timetable } from "@/models";
import { branchScope } from "@/lib/api";
import { requirePage } from "@/lib/page";
import { getClassOptions, getSectionOptions, getSubjectOptions, getTeacherOptions } from "@/lib/options";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { TimetableEditor } from "@/components/academics/timetable-editor";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const user = await requirePage("academics.view");
  const scope = branchScope(user);

  const [classes, sections, subjects, teachers, docs] = await Promise.all([
    getClassOptions(user),
    getSectionOptions(user),
    getSubjectOptions(user),
    getTeacherOptions(user),
    Timetable.find(scope)
      .populate("classId", "name")
      .populate("sectionId", "name")
      .populate("periods.subjectId", "name")
      .populate("periods.teacherId", "name")
      .sort({ dayOfWeek: 1 })
      .lean(),
  ]);

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sorted = [...docs].sort((a: any, b: any) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek));

  const rows = sorted.map((t: any) => [
    <span key="c" className="font-medium">{t.classId?.name || "-"}{t.sectionId?.name ? ` - ${t.sectionId.name}` : ""}</span>,
    t.dayOfWeek,
    String(t.periods?.length || 0),
    <div key="p" className="flex flex-wrap gap-1">
      {(t.periods || []).slice(0, 4).map((p: any, i: number) => (
        <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {p.subjectId?.name || `Period ${p.period}`} · {p.startTime}
        </span>
      ))}
      {(t.periods || []).length > 4 ? <span className="text-[11px] text-muted-foreground">+{t.periods.length - 4} more</span> : null}
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Timetable" description="Build weekly class timetables period by period." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Timetables" value={docs.length} icon={CalendarDays} tone="secondary" />
        <StatCard label="Periods scheduled" value={docs.reduce((sum: number, d: any) => sum + (d.periods?.length || 0), 0)} icon={Clock3} tone="accent" />
        <StatCard label="Classes" value={classes.length} icon={Layers} tone="info" />
      </div>

      <TimetableEditor classes={classes} sections={sections} subjects={subjects} teachers={teachers} />

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Saved timetables</h2>
        <DataTable headers={["Class", "Day", "Periods", "Preview"]} rows={rows} empty="No timetables saved yet" emptyHint="Use the editor above to create the first timetable." />
      </div>
    </div>
  );
}
