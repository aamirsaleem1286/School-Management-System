import { Plus, Wallet, Layers, Receipt } from "lucide-react";
import { FeeStructure } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getClassOptions } from "@/lib/options";
import { formatCurrency, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";

export const dynamic = "force-dynamic";

export default async function FeeStructuresPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("fees.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 12);
  const classId = readParam(params, "classId");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (classId) filter.classId = classId;
  if (q) filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [structures, total, classOptions, aggregate] = await Promise.all([
    FeeStructure.find(filter).populate("classId", "name").sort({ name: 1 }).skip(skip).limit(limit).lean(),
    FeeStructure.countDocuments(filter),
    getClassOptions(user),
    FeeStructure.aggregate([{ $match: scope }, { $group: { _id: null, avg: { $avg: "$totalAmount" }, sum: { $sum: "$totalAmount" } } }]),
  ]);

  const stats = aggregate[0] || { avg: 0, sum: 0 };

  const fields: FieldDef[] = [
    { name: "classId", label: "Class", type: "select", options: classOptions, required: true },
    { name: "name", label: "Structure name", required: true, placeholder: "e.g. Grade 5 Monthly Fee" },
    { name: "dueDay", label: "Due day of month", type: "number", defaultValue: 10, min: 1, max: 28 },
    { name: "lateFeePerDay", label: "Late fee per day", type: "number", defaultValue: 0 },
    {
      name: "items",
      label: "Fee items (JSON)",
      type: "json",
      defaultValue: "[]",
      colSpan: 2,
      help: 'Array of items, e.g. [{"category":"Tuition","amount":5000,"frequency":"monthly"}]',
    },
    { name: "isActive", label: "Active", type: "checkbox", placeholder: "Available for invoicing", defaultValue: true },
  ];

  const rows = structures.map((f: any) => [
    <div key="n">
      <p className="font-medium">{f.name}</p>
      <p className="text-xs text-muted-foreground">{f.classId?.name || "-"}</p>
    </div>,
    String(f.items?.length || 0),
    formatCurrency(f.totalAmount),
    `Day ${f.dueDay}`,
    formatCurrency(f.lateFeePerDay),
    <StatusBadge key="s" status={f.isActive ? "active" : "inactive"} />,
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit fee structure" endpoint={`/api/fee-structures/${f._id}`} method="PATCH" fields={fields} initial={safeJson(f)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/fee-structures/${f._id}`} name={f.name} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Fee structures" description="Define fee heads and amounts per class.">
        <ResourceDialog label="Add structure" title="New fee structure" endpoint="/api/fee-structures" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Structures" value={total} icon={Layers} tone="secondary" />
        <StatCard label="Average total" value={formatCurrency(stats.avg || 0)} icon={Wallet} tone="accent" />
        <StatCard label="Combined value" value={formatCurrency(stats.sum || 0)} icon={Receipt} tone="success" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar placeholder="Search fee structures" filters={[{ name: "classId", label: "Class", options: classOptions }]} />
        <DataTable headers={["Structure", "Items", "Total", "Due", "Late fee/day", "Status", ""]} rows={rows} empty="No fee structures yet" emptyHint="Create a structure so invoices can be generated." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/fees" params={{ q, classId }} />
      </div>
    </div>
  );
}
