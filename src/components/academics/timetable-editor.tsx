"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FieldOption } from "@/components/shared/resource-dialog";

type Period = { period: number; startTime: string; endTime: string; subjectId?: string; teacherId?: string; room?: string };
type TimetableDoc = { _id: string; classId: string; sectionId: string; dayOfWeek: string; periods: Period[] };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function blankPeriod(period: number): Period {
  return { period, startTime: "08:00", endTime: "08:45" };
}

export function TimetableEditor({
  classes,
  sections,
  subjects,
  teachers,
}: {
  classes: FieldOption[];
  sections: FieldOption[];
  subjects: FieldOption[];
  teachers: FieldOption[];
}) {
  const router = useRouter();
  const [classId, setClassId] = React.useState("");
  const [sectionId, setSectionId] = React.useState("");
  const [day, setDay] = React.useState("Monday");
  const [docId, setDocId] = React.useState<string | null>(null);
  const [periods, setPeriods] = React.useState<Period[]>([blankPeriod(1)]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!classId || !sectionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?${new URLSearchParams({ classId, sectionId, dayOfWeek: day })}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load timetable");
      const doc: TimetableDoc | undefined = (data.data || [])[0];
      if (doc) {
        setDocId(doc._id);
        setPeriods(doc.periods?.length ? doc.periods.map((p) => ({ ...p, subjectId: p.subjectId ? String(p.subjectId) : undefined, teacherId: p.teacherId ? String(p.teacherId) : undefined })) : [blankPeriod(1)]);
      } else {
        setDocId(null);
        setPeriods([blankPeriod(1)]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load timetable");
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId, day]);

  React.useEffect(() => {
    if (classId && sectionId) load();
  }, [classId, sectionId, day, load]);

  function update(index: number, patch: Partial<Period>) {
    setPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPeriod() {
    setPeriods((prev) => [...prev, blankPeriod(prev.length + 1)]);
  }

  function removePeriod(index: number) {
    setPeriods((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, period: i + 1 })));
  }

  async function save() {
    if (!classId || !sectionId) return;
    setSaving(true);
    try {
      const payload = {
        classId,
        sectionId,
        dayOfWeek: day,
        periods: periods.map((p) => ({
          period: p.period,
          startTime: p.startTime,
          endTime: p.endTime,
          subjectId: p.subjectId || null,
          teacherId: p.teacherId || null,
          room: p.room || "",
        })),
      };
      const res = await fetch(docId ? `/api/timetable/${docId}` : "/api/timetable", {
        method: docId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save timetable");
      toast.success("Timetable saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save timetable");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-card">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={classId || undefined} onValueChange={(v) => { setClassId(v); setSectionId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select value={sectionId || undefined} onValueChange={setSectionId} disabled={!classId}>
            <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>{sections.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Day</Label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {classId && sectionId ? (
        <div className="space-y-3">
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading timetable...</p>
          ) : (
            <>
              {periods.map((p, i) => (
                <div key={i} className="grid items-end gap-2 rounded-xl border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Period {p.period}</Label>
                    <Input type="time" value={p.startTime} onChange={(e) => update(i, { startTime: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ends</Label>
                    <Input type="time" value={p.endTime} onChange={(e) => update(i, { endTime: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label className="text-xs">Subject</Label>
                    <Select value={p.subjectId || undefined} onValueChange={(v) => update(i, { subjectId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>{subjects.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Teacher</Label>
                    <Select value={p.teacherId || undefined} onValueChange={(v) => update(i, { teacherId: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>{teachers.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs">Room</Label>
                      <Input value={p.room || ""} onChange={(e) => update(i, { room: e.target.value })} placeholder="Room" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePeriod(i)} disabled={periods.length === 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" size="sm" onClick={addPeriod}><Plus className="h-4 w-4" /> Add period</Button>
                <Button type="button" size="sm" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save timetable
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">Select a class and section to build its timetable.</p>
      )}
    </div>
  );
}
