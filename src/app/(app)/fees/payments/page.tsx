import { Banknote, CalendarDays, CreditCard, Plus } from "lucide-react";
import { Payment } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getInvoiceOptions } from "@/lib/options";
import { endOfDay, formatCurrency, formatDateTime, monthKey, startOfDay } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("fees.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const method = readParam(params, "method");
  const presetInvoice = readParam(params, "invoiceId");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (method) filter.method = method;
  if (q) filter.receiptNo = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [payments, total, invoiceOptions, todayAgg, monthAgg, count] = await Promise.all([
    Payment.find(filter)
      .populate("studentId", "firstName lastName admissionNo")
      .populate("invoiceId", "invoiceNo")
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
    getInvoiceOptions(user),
    Payment.aggregate([
      { $match: { ...scope, paidAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: { ...scope, paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.countDocuments(scope),
  ]);

  const fields: FieldDef[] = [
    { name: "invoiceId", label: "Invoice", type: "select", options: invoiceOptions, required: true, colSpan: 2 },
    { name: "amount", label: "Amount", type: "number", required: true, min: 0 },
    { name: "method", label: "Method", type: "select", required: true, defaultValue: "cash", options: [
      { label: "Cash", value: "cash" },
      { label: "Bank transfer", value: "bank_transfer" },
      { label: "Online", value: "online" },
      { label: "Card", value: "card" },
      { label: "Cheque", value: "cheque" },
    ] },
    { name: "reference", label: "Reference", placeholder: "Transaction / cheque no" },
    { name: "paidAt", label: "Paid at", type: "date" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const rows = payments.map((p: any) => [
    <span key="r" className="font-medium">{p.receiptNo}</span>,
    p.invoiceId?.invoiceNo || "-",
    <div key="s">
      <p>{p.studentId ? `${p.studentId.firstName} ${p.studentId.lastName}` : "-"}</p>
      <p className="text-xs text-muted-foreground">{p.studentId?.admissionNo || ""}</p>
    </div>,
    formatCurrency(p.amount),
    <span key="m" className="capitalize">{String(p.method).replace("_", " ")}</span>,
    p.reference || "-",
    formatDateTime(p.paidAt),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" description="Record fee collections and issue receipts.">
        <Button asChild variant="outline" size="sm">
          <a href="/api/exports/payments">Export Excel</a>
        </Button>
        <ResourceDialog
          label="Collect payment"
          title="Collect fee payment"
          description="Recording a payment updates the invoice balance automatically."
          endpoint="/api/payments"
          fields={fields}
          size="lg"
          icon={<Plus className="h-4 w-4" />}
          initial={presetInvoice ? { invoiceId: presetInvoice } : undefined}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected today" value={formatCurrency(todayAgg[0]?.total || 0)} icon={Banknote} tone="success" />
        <StatCard label={`Collected ${monthKey(new Date())}`} value={formatCurrency(monthAgg[0]?.total || 0)} icon={CalendarDays} tone="secondary" />
        <StatCard label="Total receipts" value={count} icon={CreditCard} tone="info" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search receipt number"
          filters={[
            {
              name: "method",
              label: "Method",
              options: [
                { label: "Cash", value: "cash" },
                { label: "Bank transfer", value: "bank_transfer" },
                { label: "Online", value: "online" },
                { label: "Card", value: "card" },
                { label: "Cheque", value: "cheque" },
              ],
            },
          ]}
        />
        <DataTable headers={["Receipt", "Invoice", "Student", "Amount", "Method", "Reference", "Paid at"]} rows={rows} empty="No payments recorded yet" emptyHint="Collect a payment against an unpaid invoice." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/fees/payments" params={{ q, method, invoiceId: presetInvoice }} />
      </div>
    </div>
  );
}
