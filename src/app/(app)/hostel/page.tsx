import { BedDouble, Building, Plus, Users } from "lucide-react";
import { Hostel } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, requirePage, type SearchParams } from "@/lib/page";
import { formatCurrency, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function HostelPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("hostel.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (q) filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [hostels, total] = await Promise.all([
    Hostel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Hostel.countDocuments(filter),
  ]);

  const rooms = hostels.reduce((sum: number, h: any) => sum + (h.rooms || []).length, 0);
  const capacity = hostels.reduce((sum: number, h: any) => sum + (h.rooms || []).reduce((s: number, r: any) => s + (r.capacity || 0), 0), 0);
  const occupied = hostels.reduce((sum: number, h: any) => sum + (h.rooms || []).reduce((s: number, r: any) => s + (r.occupied || 0), 0), 0);

  const fields: FieldDef[] = [
    { name: "name", label: "Hostel name", required: true, colSpan: 2 },
    {
      name: "type",
      label: "Type",
      type: "select",
      defaultValue: "boys",
      options: [
        { label: "Boys", value: "boys" },
        { label: "Girls", value: "girls" },
        { label: "Mixed", value: "mixed" },
      ],
    },
    { name: "fee", label: "Monthly fee", type: "number", defaultValue: 0 },
    { name: "wardenName", label: "Warden name" },
    { name: "wardenPhone", label: "Warden phone", type: "tel" },
    { name: "messEnabled", label: "Mess enabled", type: "checkbox", defaultValue: true },
    { name: "isActive", label: "Active", type: "checkbox", defaultValue: true },
    { name: "rooms", label: "Rooms (JSON)", type: "json", placeholder: '[{"roomNo":"A-101","capacity":4,"occupied":0}]', colSpan: 2 },
  ];

  const rows = hostels.map((h: any) => {
    const hCapacity = (h.rooms || []).reduce((s: number, r: any) => s + (r.capacity || 0), 0);
    const hOccupied = (h.rooms || []).reduce((s: number, r: any) => s + (r.occupied || 0), 0);
    const pct = hCapacity ? Math.round((hOccupied / hCapacity) * 100) : 0;
    return [
      <div key="n">
        <p className="font-medium">{h.name}</p>
        <p className="text-xs capitalize text-muted-foreground">{h.type} hostel</p>
      </div>,
      <div key="w">
        <p>{h.wardenName || "-"}</p>
        <p className="text-xs text-muted-foreground">{h.wardenPhone || ""}</p>
      </div>,
      `${(h.rooms || []).length} rooms`,
      <div key="o" className="w-40 space-y-1">
        <p className="text-xs text-muted-foreground">{hOccupied} / {hCapacity} beds</p>
        <Progress value={pct} />
      </div>,
      formatCurrency(h.fee),
      <Badge key="s" variant={h.isActive ? "success" : "muted"}>{h.isActive ? "Active" : "Inactive"}</Badge>,
      <div key="a" className="flex justify-end gap-1">
        <ResourceDialog label="Edit" title="Edit hostel" endpoint={`/api/hostels/${h._id}`} method="PATCH" fields={fields} initial={safeJson(h)} triggerVariant="ghost" triggerSize="sm" icon={null} />
        <DeleteButton endpoint={`/api/hostels/${h._id}`} name={h.name} />
      </div>,
    ];
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Hostel" description="Manage hostels, rooms and occupancy.">
        <ResourceDialog label="Add hostel" title="Add hostel" endpoint="/api/hostels" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Hostels" value={total} icon={Building} tone="secondary" />
        <StatCard label="Rooms" value={rooms} icon={BedDouble} tone="accent" />
        <StatCard label="Beds" value={capacity} icon={Users} tone="info" />
        <StatCard label="Occupied beds" value={occupied} icon={BedDouble} tone="success" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar placeholder="Search hostels" />
        <DataTable headers={["Hostel", "Warden", "Rooms", "Occupancy", "Fee", "Status", ""]} rows={rows} empty="No hostels configured" emptyHint="Create a hostel and define its rooms." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/hostel" params={{ q }} />
      </div>
    </div>
  );
}
