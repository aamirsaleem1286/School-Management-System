import { Activity, History, UserCog } from "lucide-react";
import { AuditLog } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const ACTION_VARIANT: Record<string, "success" | "warning" | "destructive" | "muted" | "secondary"> = {
  create: "success",
  update: "warning",
  delete: "destructive",
  login: "secondary",
  approved: "success",
  rejected: "destructive",
};

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("audit.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 15);
  const action = readParam(params, "action");
  const entity = readParam(params, "entity");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { organizationId: user.organizationId };
  if (scope.branchId) filter.branchId = scope.branchId;
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ userName: rx }, { description: rx }, { entity: rx }];
  }

  const [logs, total, actions, entities] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
    AuditLog.distinct("action", filter),
    AuditLog.distinct("entity", filter),
  ]);

  const rows = logs.map((l: any) => [
    <div key="u">
      <p className="font-medium">{l.userName || "System"}</p>
      <p className="text-xs capitalize text-muted-foreground">{l.userRole || "-"}</p>
    </div>,
    <Badge key="a" variant={ACTION_VARIANT[l.action] || "muted"} className="capitalize">{l.action}</Badge>,
    <div key="e">
      <p>{l.entity}</p>
      <p className="text-xs text-muted-foreground">{l.description || "-"}</p>
    </div>,
    l.ip || "-",
    formatDateTime(l.createdAt),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Audit log" description="Track every action taken across the school." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Events" value={total} icon={History} tone="secondary" />
        <StatCard label="Action types" value={actions.length} icon={Activity} tone="accent" />
        <StatCard label="Entities" value={entities.length} icon={UserCog} tone="info" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search user, entity or description"
          filters={[
            { name: "action", label: "Action", options: actions.map((a: string) => ({ label: a, value: a })) },
            { name: "entity", label: "Entity", options: entities.slice(0, 20).map((e: string) => ({ label: e, value: e })) },
          ]}
        />
        <DataTable headers={["User", "Action", "Entity", "IP", "When"]} rows={rows} empty="No audit events yet" emptyHint="Actions performed in the app will appear here." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/audit" params={{ q, action, entity }} />
      </div>
    </div>
  );
}
