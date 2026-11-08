import { GraduationCap, Layers, Plus, Users } from "lucide-react";
import { SchoolClass, Section, Student } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, requirePage, type SearchParams } from "@/lib/page";
import { safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";

export const dynamic = "force-dynamic";

export default async function ClassesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("academics.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 12);
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (q) filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [classes, total, sectionCounts, studentCounts, totalSections, totalStudents] = await Promise.all([
    SchoolClass.find(filter).sort({ level: 1, name: 1 }).skip(skip).limit(limit).lean(),
    SchoolClass.countDocuments(filter),
    Section.aggregate([{ $match: { ...scope } }, { $group: { _id: "$classId", count: { $sum: 1 } } }]),
    Student.aggregate([
      { $match: { ...scope, status: "active", classId: { $ne: null } } },
      { $group: { _id: "$classId", count: { $sum: 1 } } },
    ]),
    Section.countDocuments(scope),
    Student.countDocuments({ ...scope, status: "active" }),
  ]);

  const sectionMap = new Map(sectionCounts.map((s: any) => [String(s._id), s.count]));
  const studentMap = new Map(studentCounts.map((s: any) => [String(s._id), s.count]));

  const fields: FieldDef[] = [
    { name: "name", label: "Class name", required: true, placeholder: "e.g. Grade 5" },
    { name: "level", label: "Level", type: "number", defaultValue: 0 },
    { name: "stream", label: "Stream", placeholder: "e.g. Science" },
    { name: "capacity", label: "Capacity", type: "number", defaultValue: 40 },
    { name: "isActive", label: "Active", type: "checkbox", placeholder: "Class is active", defaultValue: true },
  ];

  const rows = classes.map((c: any) => [
    <span key="n" className="font-medium">{c.name}</span>,
    c.level || "-",
    c.stream || "-",
    String(sectionMap.get(String(c._id)) || 0),
    String(studentMap.get(String(c._id)) || 0),
    c.capacity,
    <StatusBadge key="s" status={c.isActive ? "active" : "inactive"} />,
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit class" endpoint={`/api/classes/${c._id}`} method="PATCH" fields={fields} initial={safeJson(c)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/classes/${c._id}`} name={c.name} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Classes" description="Define class levels, streams and capacities for the branch.">
        <ResourceDialog label="Add class" title="New class" endpoint="/api/classes" fields={fields} icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Classes" value={total} icon={GraduationCap} tone="secondary" />
        <StatCard label="Sections" value={totalSections} icon={Layers} tone="accent" />
        <StatCard label="Active students" value={totalStudents} icon={Users} tone="success" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar placeholder="Search classes" />
        <DataTable headers={["Class", "Level", "Stream", "Sections", "Students", "Capacity", "Status", ""]} rows={rows} empty="No classes defined yet" emptyHint="Create classes before adding sections and timetables." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/academics/classes" params={{ q }} />
      </div>
    </div>
  );
}
