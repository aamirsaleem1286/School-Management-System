import { CalendarDays, MapPin, Plus, Sparkles } from "lucide-react";
import { Event } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, requirePage, type SearchParams } from "@/lib/page";
import { formatDate, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";

export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("communication.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { description: rx }, { location: rx }];
  }

  const now = new Date();
  const [events, total, upcoming, past] = await Promise.all([
    Event.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
    Event.countDocuments(filter),
    Event.countDocuments({ ...scope, startDate: { $gte: now } }),
    Event.countDocuments({ ...scope, endDate: { $lt: now } }),
  ]);

  const fields: FieldDef[] = [
    { name: "title", label: "Title", required: true, colSpan: 2 },
    { name: "startDate", label: "Starts", type: "date", required: true },
    { name: "endDate", label: "Ends", type: "date", required: true },
    { name: "location", label: "Location" },
    { name: "type", label: "Type", placeholder: "e.g. Sports day" },
    { name: "description", label: "Description", type: "textarea", colSpan: 2 },
  ];

  const rows = events.map((e: any) => [
    <div key="t">
      <p className="font-medium">{e.title}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">{e.description || e.type || "School event"}</p>
    </div>,
    <span key="l" className="flex items-center gap-1 text-sm"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {e.location || "TBA"}</span>,
    formatDate(e.startDate),
    formatDate(e.endDate),
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit event" endpoint={`/api/events/${e._id}`} method="PATCH" fields={fields} initial={safeJson(e)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/events/${e._id}`} name={e.title} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Events" description="Plan school events and keep the calendar up to date.">
        <ResourceDialog label="New event" title="Create event" endpoint="/api/events" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Events" value={total} icon={CalendarDays} tone="secondary" />
        <StatCard label="Upcoming" value={upcoming} icon={Sparkles} tone="accent" />
        <StatCard label="Past" value={past} icon={CalendarDays} tone="info" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar placeholder="Search events" />
        <DataTable headers={["Event", "Location", "Starts", "Ends", ""]} rows={rows} empty="No events yet" emptyHint="Add events like sports day, parent meetings or excursions." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/events" params={{ q }} />
      </div>
    </div>
  );
}
