import { Briefcase, Building2, Plus, UserCheck, Users } from "lucide-react";
import { Employee } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { formatDate, safeJson } from "@/lib/utils";
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

const DEPARTMENTS = ["Academics", "Administration", "Finance", "Human Resources", "Library", "Transport", "IT", "Support"];

export default async function EmployeesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("hr.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const department = readParam(params, "department");
  const employmentStatus = readParam(params, "employmentStatus");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (department) filter.department = department;
  if (employmentStatus) filter.employmentStatus = employmentStatus;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ firstName: rx }, { lastName: rx }, { employeeNo: rx }, { designation: rx }, { email: rx }];
  }

  const [employees, total, active, departments] = await Promise.all([
    Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Employee.countDocuments(filter),
    Employee.countDocuments({ ...scope, employmentStatus: "active" }),
    Employee.distinct("department", scope),
  ]);

  const fields: FieldDef[] = [
    { name: "firstName", label: "First name", required: true },
    { name: "lastName", label: "Last name", required: true },
    { name: "designation", label: "Designation", required: true },
    { name: "department", label: "Department", type: "select", required: true, options: DEPARTMENTS.map((d) => ({ label: d, value: d })) },
    { name: "qualification", label: "Qualification" },
    { name: "experienceYears", label: "Experience (years)", type: "number", defaultValue: 0 },
    { name: "joinDate", label: "Join date", type: "date" },
    {
      name: "contractType",
      label: "Contract",
      type: "select",
      defaultValue: "permanent",
      options: [
        { label: "Permanent", value: "permanent" },
        { label: "Contract", value: "contract" },
        { label: "Visiting", value: "visiting" },
        { label: "Probation", value: "probation" },
      ],
    },
    {
      name: "employmentStatus",
      label: "Status",
      type: "select",
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "On leave", value: "on_leave" },
        { label: "Resigned", value: "resigned" },
        { label: "Terminated", value: "terminated" },
      ],
    },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "email", label: "Email", type: "email" },
    { name: "gender", label: "Gender", type: "select", options: [{ label: "Male", value: "male" }, { label: "Female", value: "female" }, { label: "Other", value: "other" }] },
    { name: "dob", label: "Date of birth", type: "date" },
    { name: "cnic", label: "CNIC" },
    { name: "address", label: "Address", type: "textarea" },
    { name: "salary.base", label: "Base salary", type: "number", defaultValue: 0 },
    { name: "salary.houseAllowance", label: "House allowance", type: "number", defaultValue: 0 },
    { name: "salary.transportAllowance", label: "Transport allowance", type: "number", defaultValue: 0 },
    { name: "salary.medicalAllowance", label: "Medical allowance", type: "number", defaultValue: 0 },
    { name: "salary.taxDeduction", label: "Tax deduction", type: "number", defaultValue: 0 },
    { name: "bankAccount", label: "Bank account" },
  ];

  const rows = employees.map((e: any) => [
    <div key="n">
      <p className="font-medium">{e.firstName} {e.lastName}</p>
      <p className="text-xs text-muted-foreground">{e.employeeNo}</p>
    </div>,
    <div key="d">
      <p>{e.designation}</p>
      <p className="text-xs text-muted-foreground">{e.department}</p>
    </div>,
    <div key="c">
      <p>{e.email || "-"}</p>
      <p className="text-xs text-muted-foreground">{e.phone || ""}</p>
    </div>,
    formatDate(e.joinDate),
    <StatusBadge key="s" status={e.employmentStatus} />,
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit employee" endpoint={`/api/employees/${e._id}`} method="PATCH" fields={fields} initial={safeJson(e)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/employees/${e._id}`} name={`${e.firstName} ${e.lastName}`} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Employees" description="Manage staff records, departments and salary structure.">
        <Button asChild variant="outline" size="sm"><a href="/api/exports/employees">Export Excel</a></Button>
        <ResourceDialog label="Add employee" title="New employee" endpoint="/api/employees" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value={total} icon={Users} tone="secondary" />
        <StatCard label="Active" value={active} icon={UserCheck} tone="success" />
        <StatCard label="Departments" value={departments.length} icon={Building2} tone="accent" />
        <StatCard label="On leave" value={total - active} icon={Briefcase} tone="warning" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search name, employee no or email"
          filters={[
            { name: "department", label: "Department", options: departments.map((d: string) => ({ label: d, value: d })) },
            {
              name: "employmentStatus",
              label: "Status",
              options: [
                { label: "Active", value: "active" },
                { label: "On leave", value: "on_leave" },
                { label: "Resigned", value: "resigned" },
                { label: "Terminated", value: "terminated" },
              ],
            },
          ]}
        />
        <DataTable headers={["Employee", "Role", "Contact", "Joined", "Status", ""]} rows={rows} empty="No employees yet" emptyHint="Add staff records to manage payroll and leave." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/hr" params={{ q, department, employmentStatus }} />
      </div>
    </div>
  );
}
