import { GraduationCap, Layers, Plus, Users } from "lucide-react";
import { Section, Student } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getClassOptions, getTeacherOptions } from "@/lib/options";
import { safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";

export const dynamic = "force-dynamic";

export default async function SectionsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("academics.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 12);
  const classId = readParam(params, "classId");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (classId) filter.classId = classId;
  if (q) filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [sections, total, classOptions, teacherOptions, totalStudents] = await Promise.all([
    Section.find(filter).populate("classId", "name").populate("classTeacherId", "name").sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Section.countDocuments(filter),
    getClassOptions(user),
    getTeacherOptions(user),
    Student.countDocuments({ ...scope, status: "active" }),
  ]);

  const counts = await Student.aggregate([
    { $match: { ...scope, status: "active", sectionId: { $ne: null } } },
    { $group: { _id: "$sectionId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c: any) => [String(c._id), c.count]));

  const fields: FieldDef[] = [
    { name: "classId", label: "Class", type: "select", options: classOptions, required: true },
    { name: "name", label: "Section name", required: true, placeholder: "e.g. A" },
    { name: "capacity", label: "Capacity", type: "number", defaultValue: 40 },
    { name: "classTeacherId", label: "Class teacher", type: "select", options: teacherOptions },
    { name: "room", label: "Room", placeholder: "e.g. Room 204" },
  ];

  const rows = sections.map((s: any) => [
    <span key="n" className="font-medium">{s.classId?.name || "-"} - {s.name}</span>,
    s.classTeacherId?.name || <span key="t" className="text-muted-foreground">Unassigned</span>,
    String(countMap.get(String(s._id)) || 0),
    s.capacity,
    s.room || "-",
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit section" endpoint={`/api/sections/${s._id}`} method="PATCH" fields={fields} initial={safeJson(s)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/sections/${s._id}`} name={`${s.classId?.name || ""} ${s.name}`} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Sections" description="Organize each class into sections with assigned teachers.">
        <ResourceDialog label="Add section" title="New section" endpoint="/api/sections" fields={fields} icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Sections" value={total} icon={Layers} tone="secondary" />
        <StatCard label="Classes" value={classOptions.length} icon={GraduationCap} tone="accent" />
        <StatCard label="Active students" value={totalStudents} icon={Users} tone="success" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar placeholder="Search sections" filters={[{ name: "classId", label: "Class", options: classOptions }]} />
        <DataTable headers={["Section", "Class teacher", "Students", "Capacity", "Room", ""]} rows={rows} empty="No sections yet" emptyHint="Create a section for each class to assign students." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/academics/sections" params={{ q, classId }} />
      </div>
    </div>
  );
}

