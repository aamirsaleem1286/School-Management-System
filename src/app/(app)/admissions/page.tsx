import { CheckCircle2, Clock3, Plus, UserPlus, XCircle } from "lucide-react";
import { Admission } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getClassOptions } from "@/lib/options";
import { formatDate, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { ActionButton } from "@/components/shared/action-button";

export const dynamic = "force-dynamic";

export default async function AdmissionsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("admissions.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const status = readParam(params, "status");

  const filter: Record<string, unknown> = branchScope(user);
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ applicationNo: rx }, { firstName: rx }, { lastName: rx }, { guardianName: rx }, { phone: rx }];
  }
  if (status) filter.status = status;

  const [admissions, total, pending, approved, rejected, classOptions] = await Promise.all([
    Admission.find(filter).populate("classAppliedId", "name").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Admission.countDocuments(filter),
    Admission.countDocuments({ ...branchScope(user), status: "pending" }),
    Admission.countDocuments({ ...branchScope(user), status: "approved" }),
    Admission.countDocuments({ ...branchScope(user), status: "rejected" }),
    getClassOptions(user),
  ]);

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
    { name: "classAppliedId", label: "Class applied for", type: "select", options: classOptions },
    { name: "guardianName", label: "Guardian name", required: true },
    { name: "relation", label: "Relation", placeholder: "Father" },
    { name: "phone", label: "Phone", type: "tel", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "previousSchool", label: "Previous school" },
    { name: "previousPercentage", label: "Previous percentage", type: "number" },
    { name: "address", label: "Address", type: "textarea" },
    { name: "notes", label: "Notes", type: "textarea" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Under review", value: "under_review" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Waitlisted", value: "waitlisted" },
      ],
    },
  ];

  const rows = admissions.map((a: any) => [
    <div key="a">
      <p className="font-medium">{a.firstName} {a.lastName}</p>
      <p className="text-xs text-muted-foreground">{a.applicationNo}</p>
    </div>,
    a.classAppliedId?.name || "-",
    <div key="g">
      <p>{a.guardianName}</p>
      <p className="text-xs text-muted-foreground">{a.phone}</p>
    </div>,
    formatDate(a.createdAt),
    <StatusBadge key="s" status={a.status} />,
    <div key="actions" className="flex items-center justify-end gap-1">
      {a.status === "approved" && !a.studentId ? (
        <ActionButton endpoint={`/api/admissions/${a._id}/convert`} method="POST" label="Enroll" variant="soft" icon={<UserPlus className="h-3.5 w-3.5" />} confirm={`Enroll ${a.firstName} ${a.lastName} as a student?`} />
      ) : null}
      <ResourceDialog label="Edit" title="Edit application" endpoint={`/api/admissions/${a._id}`} method="PATCH" fields={fields} initial={safeJson(a)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/admissions/${a._id}`} name={a.applicationNo} />
    </div>,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Admissions" description="Track applications from enquiry to enrollment.">
        <ResourceDialog label="New application" title="New admission application" endpoint="/api/admissions" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total applications" value={total} icon={UserPlus} tone="secondary" />
        <StatCard label="Pending" value={pending} icon={Clock3} tone="warning" />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected" value={rejected} icon={XCircle} tone="destructive" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Search application no, name or phone"
          filters={[
            {
              name: "status",
              label: "Status",
              options: [
                { label: "Pending", value: "pending" },
                { label: "Under review", value: "under_review" },
                { label: "Approved", value: "approved" },
                { label: "Rejected", value: "rejected" },
                { label: "Waitlisted", value: "waitlisted" },
              ],
            },
          ]}
        />
        <DataTable
          headers={["Applicant", "Class", "Guardian", "Applied", "Status", ""]}
          rows={rows}
          empty={q || status ? "No applications match your filters" : "No applications yet"}
          emptyHint="New applications submitted online will appear here."
        />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/admissions" params={{ q, status }} />
      </div>
    </div>
  );
}
