import { BookOpen, GraduationCap, Plus, Star } from "lucide-react";
import { Subject } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, requirePage, type SearchParams } from "@/lib/page";
import { safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";

export const dynamic = "force-dynamic";

export default async function SubjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("academics.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 12);
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { code: rx }];
  }

  const [subjects, total, electives] = await Promise.all([
    Subject.find(filter).populate("classIds", "name").sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Subject.countDocuments(filter),
    Subject.countDocuments({ ...scope, isElective: true }),
  ]);

  const fields: FieldDef[] = [
    { name: "name", label: "Subject name", required: true, placeholder: "e.g. Mathematics" },
    { name: "code", label: "Code", required: true, placeholder: "e.g. MATH" },
    { name: "maxMarks", label: "Max marks", type: "number", defaultValue: 100 },
    { name: "isElective", label: "Elective", type: "checkbox", placeholder: "Students may choose this subject" },
    { name: "isActive", label: "Active", type: "checkbox", placeholder: "Subject is offered", defaultValue: true },
  ];

  const rows = subjects.map((s: any) => [
    <div key="n">
      <p className="font-medium">{s.name}</p>
      <p className="text-xs text-muted-foreground">{s.code}</p>
    </div>,
    (s.classIds || []).map((c: any) => c.name).join(", ") || <span key="c" className="text-muted-foreground">All classes</span>,
    s.maxMarks,
    s.isElective ? <Badge key="e" variant="accent">Elective</Badge> : <Badge key="e" variant="muted">Core</Badge>,
    <StatusBadge key="s" status={s.isActive ? "active" : "inactive"} />,
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit subject" endpoint={`/api/subjects/${s._id}`} method="PATCH" fields={fields} initial={safeJson(s)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/subjects/${s._id}`} name={s.name} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Subjects" description="Manage the subject catalogue offered across classes.">
        <ResourceDialog label="Add subject" title="New subject" endpoint="/api/subjects" fields={fields} icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Subjects" value={total} icon={BookOpen} tone="secondary" />
        <StatCard label="Electives" value={electives} icon={Star} tone="accent" />
        <StatCard label="Core subjects" value={total - electives} icon={GraduationCap} tone="success" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar placeholder="Search subject name or code" />
        <DataTable headers={["Subject", "Classes", "Max marks", "Type", "Status", ""]} rows={rows} empty="No subjects yet" emptyHint="Add subjects before building timetables and exams." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/academics/subjects" params={{ q }} />
      </div>
    </div>
  );
}

