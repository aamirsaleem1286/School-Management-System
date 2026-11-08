import { AlertTriangle, Boxes, Package, Plus, Wallet } from "lucide-react";
import { InventoryItem } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { formatCurrency, formatNumber, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("inventory.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const category = readParam(params, "category");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (category) filter.category = category;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { sku: rx }, { supplier: rx }];
  }

  const [items, total, categories, lowStock, value] = await Promise.all([
    InventoryItem.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    InventoryItem.countDocuments(filter),
    InventoryItem.distinct("category", scope),
    InventoryItem.countDocuments({ ...scope, $expr: { $lte: ["$quantity", "$reorderLevel"] } }),
    InventoryItem.aggregate([{ $match: scope }, { $group: { _id: null, total: { $sum: { $multiply: ["$quantity", "$unitPrice"] } } } }]),
  ]);

  const fields: FieldDef[] = [
    { name: "name", label: "Item name", required: true, colSpan: 2 },
    { name: "category", label: "Category", defaultValue: "General" },
    { name: "sku", label: "SKU" },
    { name: "quantity", label: "Quantity", type: "number", defaultValue: 0, min: 0 },
    { name: "unit", label: "Unit", defaultValue: "pcs" },
    { name: "unitPrice", label: "Unit price", type: "number", defaultValue: 0 },
    { name: "reorderLevel", label: "Reorder level", type: "number", defaultValue: 0 },
    { name: "supplier", label: "Supplier" },
    { name: "location", label: "Location" },
  ];

  const rows = items.map((i: any) => {
    const low = i.quantity <= i.reorderLevel;
    return [
      <div key="n">
        <p className="font-medium">{i.name}</p>
        <p className="text-xs text-muted-foreground">{i.sku || i.supplier || "-"}</p>
      </div>,
      i.category,
      <span key="q" className="flex items-center gap-2">
        {formatNumber(i.quantity)} {i.unit}
        {low ? <Badge variant="destructive">Low</Badge> : null}
      </span>,
      formatCurrency(i.unitPrice),
      formatCurrency((i.quantity || 0) * (i.unitPrice || 0)),
      i.location || "-",
      <div key="a" className="flex justify-end gap-1">
        <ResourceDialog label="Edit" title="Edit item" endpoint={`/api/inventory/${i._id}`} method="PATCH" fields={fields} initial={safeJson(i)} triggerVariant="ghost" triggerSize="sm" icon={null} />
        <DeleteButton endpoint={`/api/inventory/${i._id}`} name={i.name} />
      </div>,
    ];
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Inventory" description="Track stock levels, suppliers and reorder points.">
        <Button asChild variant="outline" size="sm"><a href="/api/exports/inventory">Export Excel</a></Button>
        <ResourceDialog label="Add item" title="Add inventory item" endpoint="/api/inventory" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Items" value={total} icon={Package} tone="secondary" />
        <StatCard label="Categories" value={categories.length} icon={Boxes} tone="accent" />
        <StatCard label="Low stock" value={lowStock} icon={AlertTriangle} tone="warning" />
        <StatCard label="Stock value" value={formatCurrency(value[0]?.total || 0)} icon={Wallet} tone="success" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search item, SKU or supplier"
          filters={[{ name: "category", label: "Category", options: categories.map((c: string) => ({ label: c, value: c })) }]}
        />
        <DataTable headers={["Item", "Category", "Stock", "Unit price", "Value", "Location", ""]} rows={rows} empty="No inventory items" emptyHint="Add stationery, furniture and other stock items." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/inventory" params={{ q, category }} />
      </div>
    </div>
  );
}
