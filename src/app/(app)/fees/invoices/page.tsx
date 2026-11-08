import Link from "next/link";
import { AlertTriangle, CreditCard, Plus, Receipt } from "lucide-react";
import { Invoice } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getClassOptions, getStudentOptions } from "@/lib/options";
import { formatCurrency, formatDate, safeJson } from "@/lib/utils";
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

export default async function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("fees.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const status = readParam(params, "status");
  const classId = readParam(params, "classId");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (status) filter.status = status;
  if (classId) filter.classId = classId;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ invoiceNo: rx }, { month: rx }];
  }

  const [invoices, total, classOptions, studentOptions, aggregates] = await Promise.all([
    Invoice.find(filter)
      .populate("studentId", "firstName lastName admissionNo")
      .populate("classId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(filter),
    getClassOptions(user),
    getStudentOptions(user),
    Invoice.aggregate([
      { $match: scope },
      { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$total" }, balance: { $sum: "$balance" } } },
    ]),
  ]);

  const byStatus = new Map(aggregates.map((a: any) => [a._id, a]));
  const sum = (key: string, field: string) => (byStatus.get(key) as any)?.[field] || 0;
  const totalInvoiced = aggregates.reduce((s: number, a: any) => s + a.amount, 0);
  const totalBalance = aggregates.reduce((s: number, a: any) => s + a.balance, 0);
  const collected = totalInvoiced - totalBalance;
  const overdue = sum("overdue", "amount");

  const fields: FieldDef[] = [
    { name: "studentId", label: "Student", type: "select", options: studentOptions, required: true },
    { name: "dueDate", label: "Due date", type: "date", required: true },
    { name: "month", label: "Month", placeholder: "2026-11" },
    { name: "discount", label: "Discount", type: "number", defaultValue: 0 },
    { name: "fine", label: "Fine", type: "number", defaultValue: 0 },
    {
      name: "items",
      label: "Invoice items (JSON)",
      type: "json",
      defaultValue: "[]",
      colSpan: 2,
      help: 'Array of items, e.g. [{"description":"Tuition","amount":5000}]',
    },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const rows = invoices.map((inv: any) => [
    <div key="n">
      <p className="font-medium">{inv.invoiceNo}</p>
      <p className="text-xs text-muted-foreground">{inv.month || inv.term || "-"}</p>
    </div>,
    <div key="s">
      <p className="font-medium">{inv.studentId ? `${inv.studentId.firstName} ${inv.studentId.lastName}` : "-"}</p>
      <p className="text-xs text-muted-foreground">{inv.studentId?.admissionNo || ""}</p>
    </div>,
    inv.classId?.name || "-",
    formatCurrency(inv.total),
    formatCurrency(inv.paidAmount),
    formatCurrency(inv.balance),
    <StatusBadge key="st" status={inv.status} />,
    formatDate(inv.dueDate),
    <div key="a" className="flex items-center justify-end gap-1">
      {inv.balance > 0 && inv.status !== "cancelled" ? (
        <Button asChild variant="soft" size="sm">
          <Link href={`/fees/payments?invoiceId=${inv._id}`}>Collect</Link>
        </Button>
      ) : null}
      <ResourceDialog label="Edit" title="Edit invoice" endpoint={`/api/invoices/${inv._id}`} method="PATCH" fields={fields} initial={safeJson(inv)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/invoices/${inv._id}`} name={inv.invoiceNo} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Invoices" description="Issue fee invoices and track balances.">
        <Button asChild variant="outline" size="sm">
          <Link href="/fees/payments">Payments</Link>
        </Button>
        <ResourceDialog label="New invoice" title="Create invoice" endpoint="/api/invoices" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Invoiced" value={formatCurrency(totalInvoiced)} icon={Receipt} tone="secondary" />
        <StatCard label="Collected" value={formatCurrency(collected)} icon={CreditCard} tone="success" />
        <StatCard label="Outstanding" value={formatCurrency(totalBalance)} icon={Receipt} tone="warning" />
        <StatCard label="Overdue" value={formatCurrency(overdue)} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search invoice no or month"
          filters={[
            {
              name: "status",
              label: "Status",
              options: [
                { label: "Unpaid", value: "unpaid" },
                { label: "Partial", value: "partial" },
                { label: "Paid", value: "paid" },
                { label: "Overdue", value: "overdue" },
                { label: "Cancelled", value: "cancelled" },
              ],
            },
            { name: "classId", label: "Class", options: classOptions },
          ]}
          extra={<Button asChild variant="outline" size="sm"><a href="/api/exports/invoices">Export Excel</a></Button>}
        />
        <DataTable headers={["Invoice", "Student", "Class", "Total", "Paid", "Balance", "Status", "Due", ""]} rows={rows} empty="No invoices yet" emptyHint="Generate invoices for students to begin collecting fees." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/fees/invoices" params={{ q, status, classId }} />
      </div>
    </div>
  );
}
