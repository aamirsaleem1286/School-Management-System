import { Bus, MapPinned, Plus, Route, Users } from "lucide-react";
import { TransportRoute, Vehicle } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, requirePage, type SearchParams } from "@/lib/page";
import { formatCurrency, formatDate, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function TransportPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("transport.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const scope = branchScope(user);

  const routeFilter: Record<string, unknown> = { ...scope };
  if (q) routeFilter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [routes, total, vehicles, activeVehicles, capacity] = await Promise.all([
    TransportRoute.find(routeFilter).populate("vehicleId", "regNo model").sort({ name: 1 }).skip(skip).limit(limit).lean(),
    TransportRoute.countDocuments(routeFilter),
    Vehicle.find(scope).sort({ regNo: 1 }).lean(),
    Vehicle.countDocuments({ ...scope, status: "active" }),
    Vehicle.aggregate([{ $match: scope }, { $group: { _id: null, total: { $sum: "$capacity" } } }]),
  ]);

  const routeFields: FieldDef[] = [
    { name: "name", label: "Route name", required: true, colSpan: 2 },
    { name: "fee", label: "Monthly fee", type: "number", defaultValue: 0 },
    { name: "vehicleId", label: "Vehicle", type: "select", options: vehicles.map((v: any) => ({ label: `${v.regNo} · ${v.model || "Bus"}`, value: String(v._id) })) },
    { name: "driverName", label: "Driver name" },
    { name: "driverPhone", label: "Driver phone", type: "tel" },
    { name: "isActive", label: "Active", type: "checkbox", defaultValue: true },
    { name: "stops", label: "Stops (JSON)", type: "json", placeholder: '[{"name":"Main Gate","time":"07:15"}]', colSpan: 2 },
  ];

  const vehicleFields: FieldDef[] = [
    { name: "regNo", label: "Registration no", required: true },
    { name: "model", label: "Model" },
    { name: "capacity", label: "Capacity", type: "number", defaultValue: 0 },
    { name: "driverName", label: "Driver name" },
    { name: "driverPhone", label: "Driver phone", type: "tel" },
    { name: "driverLicense", label: "Driver licence" },
    { name: "insuranceExpiry", label: "Insurance expiry", type: "date" },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Maintenance", value: "maintenance" },
        { label: "Retired", value: "retired" },
      ],
    },
  ];

  const routeRows = routes.map((r: any) => [
    <div key="n">
      <p className="font-medium">{r.name}</p>
      <p className="text-xs text-muted-foreground">{(r.stops || []).length} stops</p>
    </div>,
    r.vehicleId ? `${r.vehicleId.regNo} · ${r.vehicleId.model || "Bus"}` : "-",
    <div key="d">
      <p>{r.driverName || "-"}</p>
      <p className="text-xs text-muted-foreground">{r.driverPhone || ""}</p>
    </div>,
    formatCurrency(r.fee),
    <Badge key="s" variant={r.isActive ? "success" : "muted"}>{r.isActive ? "Active" : "Inactive"}</Badge>,
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit route" endpoint={`/api/transport/routes/${r._id}`} method="PATCH" fields={routeFields} initial={safeJson(r)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/transport/routes/${r._id}`} name={r.name} />
    </div>,
  ]);

  const vehicleRows = vehicles.map((v: any) => [
    <div key="r">
      <p className="font-medium">{v.regNo}</p>
      <p className="text-xs text-muted-foreground">{v.model || "Bus"}</p>
    </div>,
    `${v.capacity} seats`,
    <div key="d">
      <p>{v.driverName || "-"}</p>
      <p className="text-xs text-muted-foreground">{v.driverPhone || ""}</p>
    </div>,
    v.insuranceExpiry ? formatDate(v.insuranceExpiry) : "-",
    <StatusBadge key="s" status={v.status} />,
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit vehicle" endpoint={`/api/transport/vehicles/${v._id}`} method="PATCH" fields={vehicleFields} initial={safeJson(v)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/transport/vehicles/${v._id}`} name={v.regNo} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Transport" description="Manage bus routes, vehicles and drivers.">
        <ResourceDialog label="Add vehicle" title="Add vehicle" endpoint="/api/transport/vehicles" fields={vehicleFields} icon={<Bus className="h-4 w-4" />} />
        <ResourceDialog label="Add route" title="Add route" endpoint="/api/transport/routes" fields={routeFields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Routes" value={total} icon={Route} tone="secondary" />
        <StatCard label="Vehicles" value={vehicles.length} icon={Bus} tone="accent" />
        <StatCard label="Active vehicles" value={activeVehicles} icon={MapPinned} tone="success" />
        <StatCard label="Total seats" value={capacity[0]?.total || 0} icon={Users} tone="info" />
      </div>

      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
        </TabsList>
        <TabsContent value="routes" className="space-y-3">
          <SearchFilterBar placeholder="Search routes" />
          <DataTable headers={["Route", "Vehicle", "Driver", "Fee", "Status", ""]} rows={routeRows} empty="No routes configured" emptyHint="Add a route and assign a vehicle and driver." />
          <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/transport" params={{ q }} />
        </TabsContent>
        <TabsContent value="vehicles">
          <DataTable headers={["Vehicle", "Capacity", "Driver", "Insurance", "Status", ""]} rows={vehicleRows} empty="No vehicles yet" emptyHint="Register buses to assign them to routes." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
