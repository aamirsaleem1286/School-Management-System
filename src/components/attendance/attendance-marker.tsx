"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn, initials } from "@/lib/utils";

type Option = { label: string; value: string };
type StudentRow = { _id: string; firstName: string; lastName: string; admissionNo: string; rollNo?: string };
type Mark = "present" | "absent" | "late" | "leave";

const STATUSES: Mark[] = ["present", "absent", "late", "leave"];

export function AttendanceMarker({
  classes,
  sections,
  initialClassId = "",
  initialSectionId = "",
}: {
  classes: Option[];
  sections: Option[];
  initialClassId?: string;
  initialSectionId?: string;
}) {
  const router = useRouter();
  const [classId, setClassId] = React.useState(initialClassId);
  const [sectionId, setSectionId] = React.useState(initialSectionId);
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = React.useState<StudentRow[]>([]);
  const [marks, setMarks] = React.useState<Record<string, Mark>>({});
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const filteredSections = React.useMemo(() => {
    if (!classId) return sections;
    return sections.filter((s) => s.value === sectionId || true);
  }, [sections, classId, sectionId]);

  const load = React.useCallback(async () => {
    if (!classId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({ classId, limit: "200", status: "active" });
      if (sectionId) qs.set("sectionId", sectionId);
      const [studentsRes, attendanceRes] = await Promise.all([
        fetch(`/api/students?${qs.toString()}`),
        fetch(`/api/attendance?${new URLSearchParams({ date, classId, ...(sectionId ? { sectionId } : {}) }).toString()}`),
      ]);
      const studentsData = await studentsRes.json();
      const attendanceData = await attendanceRes.json();
      if (!studentsRes.ok) throw new Error(studentsData.error || "Could not load students");
      const list: StudentRow[] = studentsData.data || [];
      setStudents(list);
      const next: Record<string, Mark> = {};
      for (const record of attendanceData.data || []) {
        if (record.studentId?._id) next[record.studentId._id] = record.status;
      }
      setMarks(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load roster");
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId, date]);

  React.useEffect(() => {
    load();
  }, [load]);

  function setMark(id: string, status: Mark) {
    setMarks((prev) => ({ ...prev, [id]: status }));
  }

  function markAll(status: Mark) {
    const next: Record<string, Mark> = {};
    for (const s of students) next[s._id] = status;
    setMarks(next);
  }

  async function submit() {
    if (!students.length) return;
    setSaving(true);
    try {
      const records = students.map((s) => ({ personId: s._id, status: marks[s._id] || "present" }));
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          personType: "student",
          classId,
          sectionId: sectionId || undefined,
          source: "manual",
          records,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save attendance");
      toast.success(data.message || "Attendance saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save attendance");
    } finally {
      setSaving(false);
    }
  }

  const summary = students.reduce(
    (acc, s) => {
      const m = marks[s._id] || "present";
      acc[m] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, leave: 0 } as Record<Mark, number>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={classId || undefined} onValueChange={(v) => { setClassId(v); setSectionId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select value={sectionId || undefined} onValueChange={setSectionId}>
            <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>
              {filteredSections.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" onClick={load} disabled={loading || !classId}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Load roster
          </Button>
        </div>
      </div>

      {students.length > 0 ? (
        <div className="rounded-2xl border bg-card shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-muted-foreground">{students.length} students</span>
              <StatusBadge status="present" className="bg-success/10 text-success" />
              <span className="text-muted-foreground">{summary.present}</span>
              <StatusBadge status="absent" />
              <span className="text-muted-foreground">{summary.absent}</span>
              <StatusBadge status="late" />
              <span className="text-muted-foreground">{summary.late}</span>
              <StatusBadge status="leave" />
              <span className="text-muted-foreground">{summary.leave}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => markAll("present")}>All present</Button>
              <Button size="sm" onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save attendance
              </Button>
            </div>
          </div>
          <div className="divide-y">
            {students.map((s) => (
              <div key={s._id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(`${s.firstName} ${s.lastName}`)}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-muted-foreground">{s.admissionNo}{s.rollNo ? ` · Roll ${s.rollNo}` : ""}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {STATUSES.map((status) => {
                    const active = (marks[s._id] || "present") === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setMark(s._id, status)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                          active
                            ? status === "present"
                              ? "border-success/30 bg-success/10 text-success"
                              : status === "absent"
                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                : status === "late"
                                  ? "border-warning/30 bg-warning/10 text-warning"
                                  : "border-info/30 bg-info/10 text-info"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          {classId ? (loading ? "Loading roster..." : "No active students found for this class.") : "Select a class to load its roster."}
        </div>
      )}
    </div>
  );
}
