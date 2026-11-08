import { CalendarCheck2, CheckCircle2, Clock3, Plus, XCircle } from "lucide-react";
import { LeaveRequest } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getEmployeeOptions, getStudentOptions } from "@/lib/options";
import { formatDate, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { ActionButton } from "@/components/shared/action-button";

export const dynamic = "force-dynamic";

export default async function LeavePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("hr.view");
  const params = await searchParams;
  const { page, limit, skip } = listParams(params, 10);
  const status = readParam(params, "status");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (status) filter.status = status;

  const [requests, total, pending, approved, rejected, studentOptions, employeeOptions] = await Promise.all([
    LeaveRequest.find(filter)
      .populate("studentId", "firstName lastName admissionNo")
      .populate("employeeId", "firstName lastName employeeNo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LeaveRequest.countDocuments(filter),
    LeaveRequest.countDocuments({ ...scope, status: "pending" }),
    LeaveRequest.countDocuments({ ...scope, status: "approved" }),
    LeaveRequest.countDocuments({ ...scope, status: "rejected" }),
    getStudentOptions(user),
    getEmployeeOptions(user),
  ]);

  const fields: FieldDef[] = [
    {
      name: "applicantType",
      label: "Applicant type",
      type: "select",
      required: true,
      defaultValue: "student",
      options: [
        { label: "Student", value: "student" },
        { label: "Staff", value: "staff" },
      ],
    },
    { name: "type", label: "Leave type", placeholder: "e.g. Sick leave" },
    { name: "studentId", label: "Student", type: "select", options: studentOptions },
    { name: "employeeId", label: "Employee", type: "select", options: employeeOptions },
    { name: "fromDate", label: "From", type: "date", required: true },
    { name: "toDate", label: "To", type: "date", required: true },
    { name: "reason", label: "Reason", type: "textarea", required: true, colSpan: 2 },
  ];

  const rows = requests.map((r: any) => {
    const applicant = r.studentId
      ? `${r.studentId.firstName} ${r.studentId.lastName}`
      : r.employeeId
        ? `${r.employeeId.firstName} ${r.employeeId.lastName}`
        : "-";
    return [
      <div key="a">
        <p className="font-medium">{applicant}</p>
        <p className="text-xs capitalize text-muted-foreground">{r.applicantType}</p>
      </div>,
      r.type || "General",
      `${formatDate(r.fromDate)} - ${formatDate(r.toDate)}`,
      <span key="r" className="line-clamp-2 max-w-[240px] text-xs text-muted-foreground">{r.reason}</span>,
      <StatusBadge key="s" status={r.status} />,
      r.status === "pending" ? (
        <div key="a" className="flex justify-end gap-1">
          <ActionButton endpoint={`/api/leave/${r._id}`} method="PATCH" label="Approve" body={{ status: "approved" }} variant="soft" icon={<CheckCircle2 className="h-3.5 w-3.5" />} confirm={`Approve leave for ${applicant}?`} />
          <ActionButton endpoint={`/api/leave/${r._id}`} method="PATCH" label="Reject" body={{ status: "rejected" }} variant="ghost" icon={<XCircle className="h-3.5 w-3.5" />} confirm={`Reject leave for ${applicant}?`} />
        </div>
      ) : (
        <span key="a" className="block text-right text-xs text-muted-foreground">Reviewed</span>
      ),
    ];
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Leave requests" description="Review and act on student and staff leave.">
        <ResourceDialog label="New request" title="Submit leave request" endpoint="/api/leave" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} initial={undefined} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requests" value={total} icon={CalendarCheck2} tone="secondary" />
        <StatCard label="Pending" value={pending} icon={Clock3} tone="warning" />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected" value={rejected} icon={XCircle} tone="destructive" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Filter leave requests"
          filters={[
            {
              name: "status",
              label: "Status",
              options: [
                { label: "Pending", value: "pending" },
                { label: "Approved", value: "approved" },
                { label: "Rejected", value: "rejected" },
              ],
            },
          ]}
        />
        <DataTable headers={["Applicant", "Type", "Dates", "Reason", "Status", ""]} rows={rows} empty="No leave requests" emptyHint="Requests submitted by staff or guardians appear here." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/hr/leave" params={{ status }} />
      </div>
    </div>
  );
}
