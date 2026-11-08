import { Award, FileSpreadsheet, Plus, TrendingUp } from "lucide-react";
import { Mark } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getClassOptions, getExamOptions, getSectionOptions, getStudentOptions, getSubjectOptions } from "@/lib/options";
import { safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";

export const dynamic = "force-dynamic";

export default async function MarksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("marks.view");
  const params = await searchParams;
  const { page, limit, skip } = listParams(params, 12);
  const examId = readParam(params, "examId");
  const classId = readParam(params, "classId");
  const subjectId = readParam(params, "subjectId");
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (examId) filter.examId = examId;
  if (classId) filter.classId = classId;
  if (subjectId) filter.subjectId = subjectId;

  const [marks, total, examOptions, classOptions, sectionOptions, subjectOptions, studentOptions, averages] = await Promise.all([
    Mark.find(filter)
      .populate("studentId", "firstName lastName admissionNo")
      .populate("subjectId", "name")
      .populate("examId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Mark.countDocuments(filter),
    getExamOptions(user),
    getClassOptions(user),
    getSectionOptions(user),
    getSubjectOptions(user),
    getStudentOptions(user),
    Mark.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avg: { $avg: { $multiply: [{ $divide: ["$obtainedMarks", "$totalMarks"] }, 100] } },
          top: { $max: { $multiply: [{ $divide: ["$obtainedMarks", "$totalMarks"] }, 100] } },
        },
      },
    ]),
  ]);

  const stats = averages[0] || { avg: 0, top: 0 };

  const fields: FieldDef[] = [
    { name: "examId", label: "Exam", type: "select", options: examOptions, required: true },
    { name: "studentId", label: "Student", type: "select", options: studentOptions, required: true },
    { name: "classId", label: "Class", type: "select", options: classOptions },
    { name: "sectionId", label: "Section", type: "select", options: sectionOptions },
    { name: "subjectId", label: "Subject", type: "select", options: subjectOptions, required: true },
    { name: "obtainedMarks", label: "Obtained marks", type: "number", required: true, min: 0 },
    { name: "totalMarks", label: "Total marks", type: "number", required: true, min: 1, defaultValue: 100 },
    { name: "remarks", label: "Remarks" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Submitted", value: "submitted" },
        { label: "Approved", value: "approved" },
      ],
      defaultValue: "draft",
    },
    { name: "enteredBy", label: "Entered by", type: "hidden", defaultValue: user.id },
  ];

  const rows = marks.map((m: any) => {
    const pct = m.totalMarks ? (m.obtainedMarks / m.totalMarks) * 100 : 0;
    return [
      <div key="s">
        <p className="font-medium">{m.studentId ? `${m.studentId.firstName} ${m.studentId.lastName}` : "-"}</p>
        <p className="text-xs text-muted-foreground">{m.studentId?.admissionNo || ""}</p>
      </div>,
      m.examId?.name || "-",
      m.subjectId?.name || "-",
      <span key="m">{m.obtainedMarks} / {m.totalMarks}</span>,
      `${pct.toFixed(1)}%`,
      <span key="g" className="font-medium">{m.grade || "-"}</span>,
      <StatusBadge key="st" status={m.status} />,
      <div key="a" className="flex justify-end gap-1">
        <ResourceDialog label="Edit" title="Edit marks" endpoint={`/api/marks/${m._id}`} method="PATCH" fields={fields} initial={safeJson(m)} triggerVariant="ghost" triggerSize="sm" icon={null} />
        <DeleteButton endpoint={`/api/marks/${m._id}`} name={`${m.studentId?.admissionNo || "mark"}`} />
      </div>,
    ];
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Marks" description="Record subject marks and monitor performance.">
        <ResourceDialog label="Add marks" title="Record marks" endpoint="/api/marks" fields={fields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Entries" value={total} icon={FileSpreadsheet} tone="secondary" />
        <StatCard label="Average" value={`${Number(stats.avg || 0).toFixed(1)}%`} icon={TrendingUp} tone="info" />
        <StatCard label="Top score" value={`${Number(stats.top || 0).toFixed(1)}%`} icon={Award} tone="success" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar
          placeholder="Filter marks"
          filters={[
            { name: "examId", label: "Exam", options: examOptions },
            { name: "classId", label: "Class", options: classOptions },
            { name: "subjectId", label: "Subject", options: subjectOptions },
          ]}
        />
        <DataTable headers={["Student", "Exam", "Subject", "Score", "Percent", "Grade", "Status", ""]} rows={rows} empty="No marks recorded yet" emptyHint="Add marks after an exam is completed." />
        <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/exams/marks" params={{ examId, classId, subjectId }} />
      </div>
    </div>
  );
}
