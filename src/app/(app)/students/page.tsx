import Link from "next/link";
import { GraduationCap, Plus, UserCheck, UserRound, Users } from "lucide-react";
import { SchoolClass, Student } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getClassOptions, getSectionOptions } from "@/lib/options";
import { formatDate, safeJson, startOfDay } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("students.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const status = readParam(params, "status");
  const classId = readParam(params, "classId");

  const filter: Record<string, unknown> = branchScope(user);
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ firstName: rx }, { lastName: rx }, { admissionNo: rx }, { "guardian.phone": rx }];
  }
  if (status) filter.status = status;
  if (classId) filter.classId = classId;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [students, total, activeCount, newThisMonth, classOptions, sectionOptions] = await Promise.all([
    Student.find(filter)
      .populate("classId", "name")
      .populate("sectionId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Student.countDocuments(filter),
    Student.countDocuments({ ...branchScope(user), status: "active" }),
    Student.countDocuments({ ...branchScope(user), admissionDate: { $gte: monthStart } }),
    getClassOptions(user),
    getSectionOptions(user),
  ]);

  const classNames = await SchoolClass.find(branchScope(user)).select("name").lean();
  const className = classNames.find((c: any) => String(c._id) === classId)?.name;

  const fields: FieldDef[] = [
    { name: "firstName", label: "First name", required: true },
    { name: "lastName", label: "Last name", required: true },
    {
      name: "gender",
      label: "Gender",
      type: "select",
      required: true,
      options: [
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
        { label: "Other", value: "other" },
      ],
    },
    { name: "dob", label: "Date of birth", type: "date", required: true },
    { name: "admissionNo", label: "Admission no", placeholder: "Auto-generated if empty" },
    { name: "rollNo", label: "Roll no" },
    { name: "classId", label: "Class", type: "select", options: classOptions },
    { name: "sectionId", label: "Section", type: "select", options: sectionOptions },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Graduated", value: "graduated" },
        { label: "Transferred", value: "transferred" },
        { label: "Left", value: "left" },
      ],
      defaultValue: "active",
    },
    { name: "admissionDate", label: "Admission date", type: "date" },
    { name: "guardian.fatherName", label: "Father name" },
    { name: "guardian.guardianName", label: "Guardian name" },
    { name: "guardian.relation", label: "Relation", placeholder: "Father" },
    { name: "guardian.phone", label: "Guardian phone", type: "tel" },
    { name: "guardian.email", label: "Guardian email", type: "email" },
    { name: "address", label: "Address", type: "textarea" },
    { name: "city", label: "City" },
    { name: "previousSchool", label: "Previous school" },
  ];

  const rows = students.map((s: any) => [
    <div key="name" className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-xs">{initials(`${s.firstName} ${s.lastName}`)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <Link href={`/students/${s._id}`} className="block truncate font-medium hover:text-secondary">
          {s.firstName} {s.lastName}
        </Link>
        <p className="text-xs text-muted-foreground">{s.admissionNo}</p>
      </div>
    </div>,
    s.classId?.name ? `${s.classId.name}${s.sectionId?.name ? ` - ${s.sectionId.name}` : ""}` : <span className="text-muted-foreground">Unassigned</span>,
    s.guardian?.guardianName || s.guardian?.fatherName || <span className="text-muted-foreground">-</span>,
    s.guardian?.phone || <span className="text-muted-foreground">-</span>,
    <StatusBadge key="status" status={s.status} />,
    formatDate(s.admissionDate),
    <div key="actions" className="flex items-center justify-end gap-1">
      <ResourceDialog
        label="Edit"
        title="Edit student"
        endpoint={`/api/students/${s._id}`}
        method="PATCH"
        fields={fields}
        initial={safeJson(s)}
        triggerVariant="ghost"
        triggerSize="sm"
        icon={null}
      />
      <DeleteButton endpoint={`/api/students/${s._id}`} name={`${s.firstName} ${s.lastName}`} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Students" description="Manage student records, guardians and enrollment across the school.">
        <ResourceDialog label="Add student" title="New student" description="Create a student record and link guardians." endpoint="/api/students" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={total} icon={Users} tone="secondary" />
        <StatCard label="Active" value={activeCount} icon={UserCheck} tone="success" />
        <StatCard label="New this month" value={newThisMonth} icon={GraduationCap} tone="accent" />
        <StatCard label="Classes" value={classOptions.length} icon={UserRound} tone="info" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search name, admission no or guardian phone"
          filters={[
            {
              name: "status",
              label: "Status",
              options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Graduated", value: "graduated" },
                { label: "Transferred", value: "transferred" },
                { label: "Left", value: "left" },
              ],
            },
            { name: "classId", label: "Class", options: classOptions },
          ]}
          extra={
            <Button asChild variant="outline" size="sm">
              <a href="/api/exports/students">Export Excel</a>
            </Button>
          }
        />
        <DataTable
          headers={["Student", "Class", "Guardian", "Phone", "Status", "Admitted", ""]}
          rows={rows}
          empty={q || status || classId ? "No students match your filters" : "No students yet"}
          emptyHint={q || status || classId ? `Nothing found${className ? ` in ${className}` : ""}. Try clearing the filters.` : "Add your first student to get started."}
        />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/students" params={{ q, status, classId }} />
      </div>
    </div>
  );
}
