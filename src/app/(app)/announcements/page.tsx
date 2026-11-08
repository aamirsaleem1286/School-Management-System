import { Megaphone, Plus, Radio, Send } from "lucide-react";
import { Announcement } from "@/models";
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
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("communication.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const status = readParam(params, "status");
  const priority = readParam(params, "priority");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { body: rx }];
  }

  const [announcements, total, published, urgent] = await Promise.all([
    Announcement.find(filter).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Announcement.countDocuments(filter),
    Announcement.countDocuments({ ...scope, status: "published" }),
    Announcement.countDocuments({ ...scope, priority: "urgent" }),
  ]);

  const fields: FieldDef[] = [
    { name: "title", label: "Title", required: true, colSpan: 2 },
    { name: "body", label: "Message", type: "textarea", required: true, colSpan: 2 },
    {
      name: "audience",
      label: "Audience",
      type: "select",
      defaultValue: "all",
      options: [
        { label: "Everyone", value: "all" },
        { label: "Students", value: "students" },
        { label: "Parents", value: "parents" },
        { label: "Teachers", value: "teachers" },
        { label: "Staff", value: "staff" },
        { label: "Class", value: "class" },
      ],
    },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      defaultValue: "normal",
      options: [
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Urgent", value: "urgent" },
      ],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "published",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Scheduled", value: "scheduled" },
        { label: "Published", value: "published" },
      ],
    },
    { name: "scheduledAt", label: "Publish at", type: "date", help: "Used when status is scheduled" },
    { name: "expiresAt", label: "Expires at", type: "date" },
  ];

  const rows = announcements.map((a: any) => [
    <div key="t" className="max-w-[320px]">
      <p className="truncate font-medium">{a.title}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">{a.body}</p>
    </div>,
    <span key="a" className="capitalize">{a.audience}</span>,
    <Badge key="p" variant={a.priority === "urgent" ? "destructive" : a.priority === "high" ? "warning" : "muted"}>{a.priority}</Badge>,
    <StatusBadge key="s" status={a.status} />,
    formatDate(a.publishedAt || a.createdAt),
    <div key="x" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit announcement" endpoint={`/api/announcements/${a._id}`} method="PATCH" fields={fields} initial={safeJson(a)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/announcements/${a._id}`} name={a.title} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Announcements" description="Broadcast notices to students, parents and staff.">
        <ResourceDialog label="New announcement" title="Create announcement" endpoint="/api/announcements" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Announcements" value={total} icon={Megaphone} tone="secondary" />
        <StatCard label="Published" value={published} icon={Send} tone="success" />
        <StatCard label="Urgent" value={urgent} icon={Radio} tone="destructive" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search announcements"
          filters={[
            { name: "status", label: "Status", options: [{ label: "Draft", value: "draft" }, { label: "Scheduled", value: "scheduled" }, { label: "Published", value: "published" }] },
            { name: "priority", label: "Priority", options: [{ label: "Normal", value: "normal" }, { label: "High", value: "high" }, { label: "Urgent", value: "urgent" }] },
          ]}
        />
        <DataTable headers={["Announcement", "Audience", "Priority", "Status", "Published", ""]} rows={rows} empty="No announcements yet" emptyHint="Publish a notice to reach your school community." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/announcements" params={{ q, status, priority }} />
      </div>
    </div>
  );
}
