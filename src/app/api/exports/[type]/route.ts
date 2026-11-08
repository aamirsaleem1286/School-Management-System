import { NextResponse } from "next/server";
import {
  Attendance,
  Employee,
  Expense,
  InventoryItem,
  Invoice,
  Mark,
  Payment,
  Student,
  Visitor,
} from "@/models";
import { branchScope, handleError, requireApi } from "@/lib/api";
import { buildWorkbook, toCsv } from "@/lib/excel";
import { formatDate } from "@/lib/utils";

type ExportType = "students" | "invoices" | "payments" | "employees" | "expenses" | "attendance" | "inventory" | "visitors" | "marks";

const PERMISSIONS: Record<ExportType, string> = {
  students: "students.export",
  invoices: "fees.export",
  payments: "fees.export",
  employees: "hr.export",
  expenses: "finance.export",
  attendance: "attendance.export",
  inventory: "inventory.view",
  visitors: "visitors.view",
  marks: "reports.export",
};

export async function GET(req: Request, ctx: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await ctx.params;
    const exportType = type as ExportType;
    if (!PERMISSIONS[exportType]) return NextResponse.json({ error: "Unknown export type" }, { status: 404 });
    const auth = await requireApi(PERMISSIONS[exportType]);
    if (auth.error) return auth.error;
    const scope = branchScope(auth.user);
    const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";

    let title = "";
    let columns: { header: string; key: string; width?: number }[] = [];
    let rows: Record<string, unknown>[] = [];

    if (exportType === "students") {
      title = "Students";
      const docs = await Student.find(scope).populate("classId", "name").populate("sectionId", "name").sort({ admissionNo: 1 }).lean();
      columns = [
        { header: "Admission No", key: "admissionNo" },
        { header: "Roll No", key: "rollNo" },
        { header: "Name", key: "name", width: 26 },
        { header: "Class", key: "class" },
        { header: "Section", key: "section" },
        { header: "Gender", key: "gender" },
        { header: "Guardian", key: "guardian" },
        { header: "Phone", key: "phone" },
        { header: "Status", key: "status" },
      ];
      rows = docs.map((d: any) => ({
        admissionNo: d.admissionNo,
        rollNo: d.rollNo || "",
        name: `${d.firstName} ${d.lastName}`,
        class: d.classId?.name || "",
        section: d.sectionId?.name || "",
        gender: d.gender,
        guardian: d.guardian?.guardianName || d.guardian?.fatherName || "",
        phone: d.guardian?.phone || "",
        status: d.status,
      }));
    } else if (exportType === "invoices") {
      title = "Fee Invoices";
      const docs = await Invoice.find(scope).populate("studentId", "firstName lastName admissionNo").sort({ createdAt: -1 }).lean();
      columns = [
        { header: "Invoice No", key: "invoiceNo" },
        { header: "Student", key: "student", width: 26 },
        { header: "Month", key: "month" },
        { header: "Total", key: "total" },
        { header: "Paid", key: "paidAmount" },
        { header: "Balance", key: "balance" },
        { header: "Due Date", key: "dueDate" },
        { header: "Status", key: "status" },
      ];
      rows = docs.map((d: any) => ({
        invoiceNo: d.invoiceNo,
        student: d.studentId ? `${d.studentId.firstName} ${d.studentId.lastName}` : "",
        month: d.month,
        total: d.total,
        paidAmount: d.paidAmount,
        balance: d.balance,
        dueDate: formatDate(d.dueDate),
        status: d.status,
      }));
    } else if (exportType === "payments") {
      title = "Fee Payments";
      const docs = await Payment.find(scope).populate("studentId", "firstName lastName").populate("invoiceId", "invoiceNo").sort({ paidAt: -1 }).lean();
      columns = [
        { header: "Receipt No", key: "receiptNo" },
        { header: "Invoice", key: "invoice" },
        { header: "Student", key: "student", width: 26 },
        { header: "Amount", key: "amount" },
        { header: "Method", key: "method" },
        { header: "Reference", key: "reference" },
        { header: "Paid At", key: "paidAt" },
      ];
      rows = docs.map((d: any) => ({
        receiptNo: d.receiptNo,
        invoice: d.invoiceId?.invoiceNo || "",
        student: d.studentId ? `${d.studentId.firstName} ${d.studentId.lastName}` : "",
        amount: d.amount,
        method: d.method,
        reference: d.reference,
        paidAt: formatDate(d.paidAt),
      }));
    } else if (exportType === "employees") {
      title = "Employees";
      const docs = await Employee.find(scope).sort({ employeeNo: 1 }).lean();
      columns = [
        { header: "Employee No", key: "employeeNo" },
        { header: "Name", key: "name", width: 26 },
        { header: "Designation", key: "designation" },
        { header: "Department", key: "department" },
        { header: "Email", key: "email" },
        { header: "Phone", key: "phone" },
        { header: "Status", key: "employmentStatus" },
      ];
      rows = docs.map((d: any) => ({
        employeeNo: d.employeeNo,
        name: `${d.firstName} ${d.lastName}`,
        designation: d.designation,
        department: d.department,
        email: d.email,
        phone: d.phone,
        employmentStatus: d.employmentStatus,
      }));
    } else if (exportType === "expenses") {
      title = "Expenses";
      const docs = await Expense.find(scope).sort({ date: -1 }).lean();
      columns = [
        { header: "Voucher No", key: "voucherNo" },
        { header: "Date", key: "date" },
        { header: "Category", key: "category" },
        { header: "Description", key: "description", width: 32 },
        { header: "Paid To", key: "paidTo" },
        { header: "Amount", key: "amount" },
        { header: "Method", key: "method" },
      ];
      rows = docs.map((d: any) => ({
        voucherNo: d.voucherNo,
        date: formatDate(d.date),
        category: d.category,
        description: d.description,
        paidTo: d.paidTo,
        amount: d.amount,
        method: d.method,
      }));
    } else if (exportType === "attendance") {
      title = "Attendance";
      const docs = await Attendance.find(scope)
        .populate("studentId", "firstName lastName admissionNo")
        .populate("employeeId", "firstName lastName employeeNo")
        .sort({ date: -1 })
        .limit(5000)
        .lean();
      columns = [
        { header: "Date", key: "date" },
        { header: "Type", key: "personType" },
        { header: "Person", key: "person", width: 26 },
        { header: "Status", key: "status" },
        { header: "Remarks", key: "remarks" },
      ];
      rows = docs.map((d: any) => ({
        date: formatDate(d.date),
        personType: d.personType,
        person: d.studentId
          ? `${d.studentId.firstName} ${d.studentId.lastName} (${d.studentId.admissionNo})`
          : d.employeeId
            ? `${d.employeeId.firstName} ${d.employeeId.lastName} (${d.employeeId.employeeNo})`
            : "",
        status: d.status,
        remarks: d.remarks,
      }));
    } else if (exportType === "inventory") {
      title = "Inventory";
      const docs = await InventoryItem.find(scope).sort({ name: 1 }).lean();
      columns = [
        { header: "Name", key: "name", width: 26 },
        { header: "Category", key: "category" },
        { header: "SKU", key: "sku" },
        { header: "Quantity", key: "quantity" },
        { header: "Unit", key: "unit" },
        { header: "Unit Price", key: "unitPrice" },
        { header: "Supplier", key: "supplier" },
      ];
      rows = docs.map((d: any) => ({
        name: d.name,
        category: d.category,
        sku: d.sku,
        quantity: d.quantity,
        unit: d.unit,
        unitPrice: d.unitPrice,
        supplier: d.supplier,
      }));
    } else if (exportType === "visitors") {
      title = "Visitors";
      const docs = await Visitor.find(scope).sort({ checkIn: -1 }).lean();
      columns = [
        { header: "Name", key: "name" },
        { header: "Phone", key: "phone" },
        { header: "Purpose", key: "purpose", width: 26 },
        { header: "Meeting With", key: "meetingWith" },
        { header: "Check In", key: "checkIn" },
        { header: "Check Out", key: "checkOut" },
        { header: "Status", key: "status" },
      ];
      rows = docs.map((d: any) => ({
        name: d.name,
        phone: d.phone,
        purpose: d.purpose,
        meetingWith: d.meetingWith,
        checkIn: formatDate(d.checkIn),
        checkOut: d.checkOut ? formatDate(d.checkOut) : "",
        status: d.status,
      }));
    } else {
      title = "Marks";
      const docs = await Mark.find(scope)
        .populate("studentId", "firstName lastName admissionNo")
        .populate("subjectId", "name")
        .populate("examId", "name")
        .limit(5000)
        .lean();
      columns = [
        { header: "Exam", key: "exam" },
        { header: "Student", key: "student", width: 26 },
        { header: "Subject", key: "subject" },
        { header: "Obtained", key: "obtainedMarks" },
        { header: "Total", key: "totalMarks" },
        { header: "Grade", key: "grade" },
        { header: "GPA", key: "gpa" },
      ];
      rows = docs.map((d: any) => ({
        exam: d.examId?.name || "",
        student: d.studentId ? `${d.studentId.firstName} ${d.studentId.lastName}` : "",
        subject: d.subjectId?.name || "",
        obtainedMarks: d.obtainedMarks,
        totalMarks: d.totalMarks,
        grade: d.grade,
        gpa: d.gpa,
      }));
    }

    const filename = `${exportType}-${new Date().toISOString().slice(0, 10)}`;
    if (format === "csv") {
      return new NextResponse(toCsv(columns, rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }
    const buffer = await buildWorkbook(title, columns, rows);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
