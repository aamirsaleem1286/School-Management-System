import { CalendarClock, LogOut, Plus, UserCheck, Users } from "lucide-react";
import { Visitor } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { endOfDay, formatDateTime, safeJson, startOfDay } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { ActionButton } from "@/components/shared/action-button";

export const dynamic = "force-dynamic";

export default async function VisitorsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("visitors.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const status = readParam(params, "status");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { phone: rx }, { purpose: rx }, { meetingWith: rx }];
  }

  const today = { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) };
  const [visitors, total, todayCount, checkedIn] = await Promise.all([
    Visitor.find(filter).sort({ checkIn: -1 }).skip(skip).limit(limit).lean(),
    Visitor.countDocuments(filter),
    Visitor.countDocuments({ ...scope, checkIn: today }),
    Visitor.countDocuments({ ...scope, status: "checked_in" }),
  ]);

  const fields: FieldDef[] = [
    { name: "name", label: "Visitor name", required: true },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "purpose", label: "Purpose", required: true, colSpan: 2 },
    { name: "meetingWith", label: "Meeting with" },
    { name: "idProof", label: "ID proof" },
    { name: "badgeNo", label: "Badge no" },
    { name: "status", label: "Status", type: "hidden", defaultValue: "checked_in" },
  ];

  const rows = visitors.map((v: any) => [
    <div key="n">
      <p className="font-medium">{v.name}</p>
      <p className="text-xs text-muted-foreground">{v.phone || "-"}</p>
    </div>,
    v.purpose,
    v.meetingWith || "-",
    formatDateTime(v.checkIn),
    v.checkOut ? formatDateTime(v.checkOut) : "-",
    <StatusBadge key="s" status={v.status} />,
    <div key="a" className="flex justify-end gap-1">
      {v.status === "checked_in" ? (
        <ActionButton endpoint={`/api/visitors/${v._id}`} method="PATCH" label="Check out" body={{ status: "checked_out", checkOut: new Date().toISOString() }} variant="soft" icon={<LogOut className="h-3.5 w-3.5" />} confirm={`Check out ${v.name}?`} />
      ) : null}
      <ResourceDialog label="Edit" title="Edit visitor" endpoint={`/api/visitors/${v._id}`} method="PATCH" fields={fields} initial={safeJson(v)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/visitors/${v._id}`} name={v.name} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Visitors" description="Log visitor entries and check-outs at the gate.">
        <ResourceDialog label="Log visitor" title="Log visitor" endpoint="/api/visitors" fields={fields} icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visitors" value={total} icon={Users} tone="secondary" />
        <StatCard label="Today" value={todayCount} icon={CalendarClock} tone="accent" />
        <StatCard label="Currently in" value={checkedIn} icon={UserCheck} tone="success" />
        <StatCard label="Checked out" value={Math.max(total - checkedIn, 0)} icon={LogOut} tone="info" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search visitor, phone or purpose"
          filters={[
            { name: "status", label: "Status", options: [{ label: "Checked in", value: "checked_in" }, { label: "Checked out", value: "checked_out" }] },
          ]}
        />
        <DataTable headers={["Visitor", "Purpose", "Meeting", "Check in", "Check out", "Status", ""]} rows={rows} empty="No visitors logged" emptyHint="Record visitor entries at the front desk." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/visitors" params={{ q, status }} />
      </div>
    </div>
  );
}
