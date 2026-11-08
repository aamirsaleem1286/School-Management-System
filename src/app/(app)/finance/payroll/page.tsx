import { CalendarDays, Plus, Users, Wallet } from "lucide-react";
import { Payroll } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getEmployeeOptions } from "@/lib/options";
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function PayrollPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("payroll.view");
  const params = await searchParams;
  const { page, limit, skip } = listParams(params, 12);
  const month = readParam(params, "month");
  const year = readParam(params, "year");
  const status = readParam(params, "status");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  if (status) filter.status = status;

  const now = new Date();
  const [payrolls, total, employeeOptions, monthAgg, paidAgg] = await Promise.all([
    Payroll.find(filter).populate("employeeId", "firstName lastName employeeNo").sort({ year: -1, month: -1 }).skip(skip).limit(limit).lean(),
    Payroll.countDocuments(filter),
    getEmployeeOptions(user),
    Payroll.aggregate([
      { $match: { ...scope, month: now.getMonth() + 1, year: now.getFullYear() } },
      { $group: { _id: null, total: { $sum: "$netSalary" }, count: { $sum: 1 } } },
    ]),
    Payroll.aggregate([{ $match: { ...scope, status: "paid" } }, { $group: { _id: null, total: { $sum: "$netSalary" } } }]),
  ]);

  const fields: FieldDef[] = [
    { name: "employeeId", label: "Employee", type: "select", options: employeeOptions, required: true, colSpan: 2 },
    { name: "month", label: "Month", type: "select", required: true, defaultValue: String(now.getMonth() + 1), options: MONTHS.map((m, i) => ({ label: m, value: String(i + 1) })) },
    { name: "year", label: "Year", type: "number", required: true, defaultValue: now.getFullYear() },
    { name: "bonus", label: "Bonus", type: "number", defaultValue: 0 },
    { name: "deductions", label: "Extra deductions", type: "number", defaultValue: 0 },
    { name: "notes", label: "Notes", type: "textarea" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Approved", value: "approved" },
        { label: "Paid", value: "paid" },
      ],
      defaultValue: "draft",
    },
  ];

  const rows = payrolls.map((p: any) => [
    <div key="e">
      <p className="font-medium">{p.employeeId ? `${p.employeeId.firstName} ${p.employeeId.lastName}` : "-"}</p>
      <p className="text-xs text-muted-foreground">{p.employeeId?.employeeNo || ""}</p>
    </div>,
    `${MONTHS[p.month - 1]} ${p.year}`,
    formatCurrency(p.baseSalary),
    formatCurrency(p.allowances),
    formatCurrency(p.bonus),
    formatCurrency(p.deductions),
    <span key="n" className="font-semibold">{formatCurrency(p.netSalary)}</span>,
    <StatusBadge key="s" status={p.status} />,
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit payroll" endpoint={`/api/payroll/${p._id}`} method="PATCH" fields={fields} initial={safeJson(p)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/payroll/${p._id}`} name={`${p.employeeId?.employeeNo || "payroll"} ${MONTHS[p.month - 1]}`} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Payroll" description="Process monthly staff salaries and allowances.">
        <ResourceDialog label="Run payroll" title="Add payroll entry" description="Salary and allowances are pulled from the employee record." endpoint="/api/payroll" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={`Net payroll · ${MONTHS[now.getMonth()]}`} value={formatCurrency(monthAgg[0]?.total || 0)} icon={Wallet} tone="secondary" />
        <StatCard label="Staff paid this month" value={monthAgg[0]?.count || 0} icon={Users} tone="info" />
        <StatCard label="Total paid (all time)" value={formatCurrency(paidAgg[0]?.total || 0)} icon={CalendarDays} tone="success" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Filter payroll"
          filters={[
            { name: "month", label: "Month", options: MONTHS.map((m, i) => ({ label: m, value: String(i + 1) })) },
            { name: "status", label: "Status", options: [{ label: "Draft", value: "draft" }, { label: "Approved", value: "approved" }, { label: "Paid", value: "paid" }] },
          ]}
        />
        <DataTable headers={["Employee", "Period", "Base", "Allowances", "Bonus", "Deductions", "Net", "Status", ""]} rows={rows} empty="No payroll entries yet" emptyHint="Add employees, then run payroll for the month." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/finance/payroll" params={{ month, year, status }} />
      </div>
    </div>
  );
}
