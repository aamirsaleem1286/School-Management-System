import { CalendarDays, FileSpreadsheet, Plus, ReceiptText } from "lucide-react";
import { Expense } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { formatCurrency, formatDate, monthKey, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Salaries", "Utilities", "Maintenance", "Supplies", "Transport", "Rent", "Marketing", "Events", "Other"];

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("finance.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const category = readParam(params, "category");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (category) filter.category = category;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ voucherNo: rx }, { description: rx }, { paidTo: rx }];
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [expenses, total, monthAgg, categoryAgg] = await Promise.all([
    Expense.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    Expense.countDocuments(filter),
    Expense.aggregate([{ $match: { ...scope, date: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Expense.aggregate([{ $match: scope }, { $group: { _id: "$category", total: { $sum: "$amount" } } }, { $sort: { total: -1 } }]),
  ]);

  const totalSpend = categoryAgg.reduce((s: number, c: any) => s + c.total, 0);
  const topCategory = categoryAgg[0];

  const fields: FieldDef[] = [
    { name: "description", label: "Description", required: true, colSpan: 2 },
    { name: "category", label: "Category", type: "select", required: true, options: CATEGORIES.map((c) => ({ label: c, value: c })) },
    { name: "amount", label: "Amount", type: "number", required: true, min: 0 },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "paidTo", label: "Paid to" },
    { name: "method", label: "Method", type: "select", defaultValue: "cash", options: [
      { label: "Cash", value: "cash" },
      { label: "Bank transfer", value: "bank_transfer" },
      { label: "Cheque", value: "cheque" },
      { label: "Online", value: "online" },
    ] },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const rows = expenses.map((e: any) => [
    <div key="d">
      <p className="font-medium">{e.description}</p>
      <p className="text-xs text-muted-foreground">{e.voucherNo}</p>
    </div>,
    e.category,
    formatCurrency(e.amount),
    e.paidTo || "-",
    <span key="m" className="capitalize">{String(e.method).replace("_", " ")}</span>,
    formatDate(e.date),
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit expense" endpoint={`/api/expenses/${e._id}`} method="PATCH" fields={fields} initial={safeJson(e)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/expenses/${e._id}`} name={e.voucherNo} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Expenses" description="Track operating expenses and vouchers.">
        <Button asChild variant="outline" size="sm"><a href="/api/exports/expenses">Export Excel</a></Button>
        <ResourceDialog label="Add expense" title="Record expense" endpoint="/api/expenses" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="This month" value={formatCurrency(monthAgg[0]?.total || 0)} icon={CalendarDays} tone="warning" />
        <StatCard label="Total spend" value={formatCurrency(totalSpend)} icon={ReceiptText} tone="secondary" />
        <StatCard label="Top category" value={topCategory?._id || "-"} icon={FileSpreadsheet} tone="accent" />
        <StatCard label="Vouchers" value={total} icon={FileSpreadsheet} tone="info" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar placeholder="Search voucher, description or payee" filters={[{ name: "category", label: "Category", options: CATEGORIES.map((c) => ({ label: c, value: c })) }]} />
        <DataTable headers={["Expense", "Category", "Amount", "Paid to", "Method", "Date", ""]} rows={rows} empty="No expenses recorded yet" emptyHint="Record your first expense voucher." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/finance/expenses" params={{ q, category }} />
      </div>
    </div>
  );
}
