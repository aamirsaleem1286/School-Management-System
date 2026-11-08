import Link from "next/link";
import { CalendarRange, FileText, Plus, Timer } from "lucide-react";
import { Exam } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { formatDate, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ExamsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("exams.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const status = readParam(params, "status");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (status) filter.status = status;
  if (q) filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [exams, total, ongoing, published] = await Promise.all([
    Exam.find(filter).populate("classIds", "name").sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
    Exam.countDocuments(filter),
    Exam.countDocuments({ ...scope, status: "ongoing" }),
    Exam.countDocuments({ ...scope, status: "published" }),
  ]);

  const fields: FieldDef[] = [
    { name: "name", label: "Exam name", required: true, colSpan: 2 },
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { label: "Quiz", value: "quiz" },
        { label: "Monthly", value: "monthly" },
        { label: "Midterm", value: "midterm" },
        { label: "Final", value: "final" },
        { label: "Practical", value: "practical" },
      ],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Scheduled", value: "scheduled" },
        { label: "Ongoing", value: "ongoing" },
        { label: "Completed", value: "completed" },
        { label: "Published", value: "published" },
      ],
      defaultValue: "scheduled",
    },
    { name: "startDate", label: "Start date", type: "date", required: true },
    { name: "endDate", label: "End date", type: "date", required: true },
    { name: "createdBy", label: "Created by", type: "hidden", defaultValue: user.id },
  ];

  const rows = exams.map((e: any) => [
    <div key="n">
      <p className="font-medium">{e.name}</p>
      <p className="text-xs capitalize text-muted-foreground">{e.type}</p>
    </div>,
    (e.classIds || []).map((c: any) => c.name).join(", ") || <span key="c" className="text-muted-foreground">All classes</span>,
    formatDate(e.startDate),
    formatDate(e.endDate),
    <StatusBadge key="s" status={e.status} />,
    <div key="a" className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/exams/marks?examId=${e._id}`}>Marks</Link>
      </Button>
      <ResourceDialog label="Edit" title="Edit exam" endpoint={`/api/exams/${e._id}`} method="PATCH" fields={fields} initial={safeJson(e)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/exams/${e._id}`} name={e.name} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Examinations" description="Schedule exams, manage marks and publish results.">
        <Button asChild variant="outline" size="sm">
          <Link href="/exams/marks">Enter marks</Link>
        </Button>
        <ResourceDialog label="New exam" title="Schedule exam" endpoint="/api/exams" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Exams" value={total} icon={FileText} tone="secondary" />
        <StatCard label="Ongoing" value={ongoing} icon={Timer} tone="warning" />
        <StatCard label="Published" value={published} icon={CalendarRange} tone="success" />
        <StatCard label="Scheduled" value={total - ongoing - published} icon={CalendarRange} tone="info" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search exams"
          filters={[
            {
              name: "status",
              label: "Status",
              options: [
                { label: "Scheduled", value: "scheduled" },
                { label: "Ongoing", value: "ongoing" },
                { label: "Completed", value: "completed" },
                { label: "Published", value: "published" },
              ],
            },
          ]}
        />
        <DataTable headers={["Exam", "Classes", "Starts", "Ends", "Status", ""]} rows={rows} empty="No exams scheduled yet" emptyHint="Create an exam to start recording marks." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/exams" params={{ q, status }} />
      </div>
    </div>
  );
}
