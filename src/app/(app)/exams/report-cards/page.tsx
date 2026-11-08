import Link from "next/link";
import { Award, ScrollText, Users } from "lucide-react";
import { Exam, Mark } from "@/models";
import { branchScope } from "@/lib/api";
import { readParam, requirePage, type SearchParams } from "@/lib/page";
import { getExamOptions } from "@/lib/options";
import { calculateGrade, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ReportCardsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("exams.view");
  const params = await searchParams;
  const examId = readParam(params, "examId");
  const scope = branchScope(user);

  const [examOptions, exams] = await Promise.all([
    getExamOptions(user),
    Exam.find(scope).sort({ startDate: -1 }).lean(),
  ]);
  const exam: any = examId ? exams.find((e: any) => String(e._id) === examId) : exams[0];

  let rows: React.ReactNode[][] = [];
  let average = 0;
  let passRate = 0;
  let studentsCount = 0;

  if (exam) {
    const marks = await Mark.find({ ...scope, examId: exam._id })
      .populate("studentId", "firstName lastName admissionNo")
      .populate("subjectId", "name")
      .lean();

    const byStudent = new Map<string, { student: any; obtained: number; total: number; subjects: number }>();
    for (const m of marks as any[]) {
      if (!m.studentId) continue;
      const key = String(m.studentId._id);
      const entry = byStudent.get(key) || { student: m.studentId, obtained: 0, total: 0, subjects: 0 };
      entry.obtained += Number(m.obtainedMarks || 0);
      entry.total += Number(m.totalMarks || 0);
      entry.subjects += 1;
      byStudent.set(key, entry);
    }

    const results = [...byStudent.values()]
      .map((r) => ({ ...r, percentage: r.total ? (r.obtained / r.total) * 100 : 0 }))
      .sort((a, b) => b.percentage - a.percentage);

    studentsCount = results.length;
    average = studentsCount ? results.reduce((sum, r) => sum + r.percentage, 0) / studentsCount : 0;
    passRate = studentsCount ? (results.filter((r) => r.percentage >= 40).length / studentsCount) * 100 : 0;

    rows = results.slice(0, 100).map((r, index) => {
      const grade = calculateGrade(r.percentage);
      return [
        <span key="p" className="font-medium">{index + 1}</span>,
        <div key="s">
          <p className="font-medium">{r.student.firstName} {r.student.lastName}</p>
          <p className="text-xs text-muted-foreground">{r.student.admissionNo}</p>
        </div>,
        String(r.subjects),
        `${r.obtained} / ${r.total}`,
        `${r.percentage.toFixed(1)}%`,
        <span key="g" className="font-medium">{grade.grade}</span>,
        Number(grade.gpa).toFixed(2),
        <Badge key="r" variant={r.percentage >= 40 ? "success" : "destructive"}>{r.percentage >= 40 ? "Pass" : "Fail"}</Badge>,
      ];
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Report cards" description="Aggregated results per student for the selected exam.">
        <ScrollText className="hidden h-5 w-5 text-muted-foreground sm:block" />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students with marks" value={studentsCount} icon={Users} tone="secondary" />
        <StatCard label="Class average" value={`${average.toFixed(1)}%`} icon={Award} tone="info" />
        <StatCard label="Pass rate" value={`${passRate.toFixed(1)}%`} icon={Award} tone="success" />
      </div>

      <div className="space-y-3">
        <SearchFilterBar placeholder="Select an exam" filters={[{ name: "examId", label: "Exam", options: examOptions }]} />
        {exam ? (
          <>
            <p className="text-xs text-muted-foreground">
              Showing results for <span className="font-medium text-foreground">{exam.name}</span> · {formatDate(exam.startDate)}
            </p>
            <DataTable headers={["#", "Student", "Subjects", "Score", "Percent", "Grade", "GPA", "Result"]} rows={rows} empty="No marks recorded for this exam" emptyHint="Enter marks first, then return here." />
            <p className="text-xs text-muted-foreground">
              Need to enter marks? <Link href={`/exams/marks?examId=${exam._id}`} className="text-secondary underline-offset-2 hover:underline">Open marks entry</Link>
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            Create an exam and enter marks to generate report cards.
          </div>
        )}
      </div>
    </div>
  );
}
