import { CheckCircle2, ClipboardList, Plus } from "lucide-react";
import { Homework } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getClassOptions, getSectionOptions, getSubjectOptions } from "@/lib/options";
import { formatDate, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";

export const dynamic = "force-dynamic";

export default async function HomeworkPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("academics.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const classId = readParam(params, "classId");
  const status = readParam(params, "status");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (classId) filter.classId = classId;
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { description: rx }];
  }

  const [homework, total, openCount, classOptions, sectionOptions, subjectOptions] = await Promise.all([
    Homework.find(filter)
      .populate("classId", "name")
      .populate("sectionId", "name")
      .populate("subjectId", "name")
      .sort({ dueDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Homework.countDocuments(filter),
    Homework.countDocuments({ ...scope, status: "open" }),
    getClassOptions(user),
    getSectionOptions(user),
    getSubjectOptions(user),
  ]);

  const fields: FieldDef[] = [
    { name: "title", label: "Title", required: true, colSpan: 2 },
    { name: "classId", label: "Class", type: "select", options: classOptions, required: true },
    { name: "sectionId", label: "Section", type: "select", options: sectionOptions, required: true },
    { name: "subjectId", label: "Subject", type: "select", options: subjectOptions, required: true },
    { name: "dueDate", label: "Due date", type: "date", required: true },
    { name: "description", label: "Instructions", type: "textarea", colSpan: 2 },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Open", value: "open" },
        { label: "Closed", value: "closed" },
      ],
      defaultValue: "open",
    },
    { name: "teacherId", label: "Teacher", type: "hidden", defaultValue: user.id },
  ];

  const rows = homework.map((h: any) => [
    <div key="t">
      <p className="font-medium">{h.title}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">{h.description || "No instructions"}</p>
    </div>,
    `${h.classId?.name || "-"}${h.sectionId?.name ? ` - ${h.sectionId.name}` : ""}`,
    h.subjectId?.name || "-",
    formatDate(h.dueDate),
    <StatusBadge key="s" status={h.status} />,
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit homework" endpoint={`/api/homework/${h._id}`} method="PATCH" fields={fields} initial={safeJson(h)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/homework/${h._id}`} name={h.title} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Homework" description="Assign homework to classes and track due dates.">
        <ResourceDialog label="Assign homework" title="New homework" endpoint="/api/homework" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assignments" value={total} icon={ClipboardList} tone="secondary" />
        <StatCard label="Open" value={openCount} icon={ClipboardList} tone="warning" />
        <StatCard label="Closed" value={total - openCount} icon={CheckCircle2} tone="success" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search homework"
          filters={[
            { name: "classId", label: "Class", options: classOptions },
            { name: "status", label: "Status", options: [{ label: "Open", value: "open" }, { label: "Closed", value: "closed" }] },
          ]}
        />
        <DataTable headers={["Homework", "Class", "Subject", "Due", "Status", ""]} rows={rows} empty="No homework assigned yet" />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/academics/homework" params={{ q, classId, status }} />
      </div>
    </div>
  );
}
