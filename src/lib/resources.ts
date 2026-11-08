import "server-only";
import {
  Admission,
  Announcement,
  Employee,
  Event,
  Exam,
  Expense,
  FeeStructure,
  Homework,
  Hostel,
  InventoryItem,
  Invoice,
  LibraryBook,
  LibraryTransaction,
  Mark,
  Payroll,
  SchoolClass,
  Section,
  Student,
  Subject,
  Timetable,
  TransportRoute,
  Vehicle,
  Visitor,
} from "@/models";
import type { CrudConfig } from "./crud";
import {
  admissionSchema,
  announcementSchema,
  classSchema,
  employeeSchema,
  examSchema,
  expenseSchema,
  feeStructureSchema,
  hostelSchema,
  inventoryItemSchema,
  invoiceSchema,
  libraryBookSchema,
  sectionSchema,
  studentSchema,
  subjectSchema,
  transportRouteSchema,
  vehicleSchema,
  visitorSchema,
} from "./validators";
import { nextSequence } from "./numbering";
import { calculateGrade, monthKey } from "./utils";

function branchOf(user: { activeBranchId?: string | null; branchId?: string | null }) {
  return user.activeBranchId || user.branchId || "";
}

export const studentResource: CrudConfig = {
  model: Student,
  permission: "students",
  entity: "Student",
  labelField: "admissionNo",
  searchFields: ["firstName", "lastName", "admissionNo", "rollNo", "guardian.phone", "guardian.guardianName"],
  sort: { createdAt: -1 },
  populate: [
    { path: "classId", select: "name" },
    { path: "sectionId", select: "name" },
  ],
  schema: studentSchema,
  filter: (p) => {
    const f: Record<string, unknown> = {};
    for (const key of ["status", "classId", "sectionId", "gender"]) {
      const v = p.get(key);
      if (v) f[key] = v;
    }
    return f;
  },
  beforeCreate: async (data, user) => {
    if (!data.admissionNo) data.admissionNo = await nextSequence(user.organizationId, branchOf(user), "admission", "STD");
    return data;
  },
};

export const admissionResource: CrudConfig = {
  model: Admission,
  permission: "admissions",
  entity: "Admission",
  labelField: "applicationNo",
  searchFields: ["applicationNo", "firstName", "lastName", "guardianName", "phone"],
  populate: [{ path: "classAppliedId", select: "name" }],
  schema: admissionSchema,
  filter: (p) => (p.get("status") ? { status: p.get("status") } : {}),
  beforeCreate: async (data, user) => {
    if (!data.applicationNo) data.applicationNo = await nextSequence(user.organizationId, branchOf(user), "admission");
    return data;
  },
};

export const classResource: CrudConfig = {
  model: SchoolClass,
  permission: "academics",
  entity: "Class",
  labelField: "name",
  searchFields: ["name", "stream"],
  sort: { level: 1, name: 1 },
  schema: classSchema,
};

export const sectionResource: CrudConfig = {
  model: Section,
  permission: "academics",
  entity: "Section",
  labelField: "name",
  searchFields: ["name", "room"],
  sort: { name: 1 },
  populate: [{ path: "classId", select: "name" }],
  schema: sectionSchema,
  filter: (p) => (p.get("classId") ? { classId: p.get("classId") } : {}),
};

export const subjectResource: CrudConfig = {
  model: Subject,
  permission: "academics",
  entity: "Subject",
  labelField: "name",
  searchFields: ["name", "code"],
  sort: { name: 1 },
  schema: subjectSchema,
  filter: (p) => (p.get("classId") ? { classIds: p.get("classId") } : {}),
};

export const timetableResource: CrudConfig = {
  model: Timetable,
  permission: "academics",
  entity: "Timetable",
  searchFields: [],
  populate: [
    { path: "classId", select: "name" },
    { path: "sectionId", select: "name" },
  ],
  filter: (p) => {
    const f: Record<string, unknown> = {};
    for (const key of ["classId", "sectionId", "dayOfWeek"]) {
      const v = p.get(key);
      if (v) f[key] = v;
    }
    return f;
  },
};

export const homeworkResource: CrudConfig = {
  model: Homework,
  permission: "academics",
  entity: "Homework",
  labelField: "title",
  searchFields: ["title", "description"],
  populate: [
    { path: "classId", select: "name" },
    { path: "sectionId", select: "name" },
    { path: "subjectId", select: "name" },
  ],
  filter: (p) => {
    const f: Record<string, unknown> = {};
    for (const key of ["classId", "sectionId", "subjectId", "status"]) {
      const v = p.get(key);
      if (v) f[key] = v;
    }
    return f;
  },
};

export const examResource: CrudConfig = {
  model: Exam,
  permission: "exams",
  entity: "Exam",
  labelField: "name",
  searchFields: ["name"],
  sort: { startDate: -1 },
  schema: examSchema,
  filter: (p) => (p.get("status") ? { status: p.get("status") } : {}),
};

export const markResource: CrudConfig = {
  model: Mark,
  permission: "marks",
  entity: "Mark",
  searchFields: [],
  populate: [
    { path: "studentId", select: "firstName lastName admissionNo" },
    { path: "subjectId", select: "name code" },
    { path: "examId", select: "name" },
  ],
  filter: (p) => {
    const f: Record<string, unknown> = {};
    for (const key of ["examId", "classId", "sectionId", "subjectId", "studentId", "status"]) {
      const v = p.get(key);
      if (v) f[key] = v;
    }
    return f;
  },
  beforeCreate: (data) => {
    const percentage = (Number(data.obtainedMarks) / Number(data.totalMarks)) * 100;
    const row = calculateGrade(percentage);
    data.grade = row.grade;
    data.gpa = row.gpa;
    return data;
  },
  beforeUpdate: (data) => {
    if (data.obtainedMarks != null && data.totalMarks != null) {
      const percentage = (Number(data.obtainedMarks) / Number(data.totalMarks)) * 100;
      const row = calculateGrade(percentage);
      data.grade = row.grade;
      data.gpa = row.gpa;
    }
    return data;
  },
};

export const feeStructureResource: CrudConfig = {
  model: FeeStructure,
  permission: "fees",
  entity: "Fee structure",
  labelField: "name",
  searchFields: ["name"],
  populate: [{ path: "classId", select: "name" }],
  schema: feeStructureSchema,
  filter: (p) => (p.get("classId") ? { classId: p.get("classId") } : {}),
  beforeCreate: (data) => {
    data.totalAmount = (data.items || []).reduce((sum: number, i: { amount: number }) => sum + Number(i.amount || 0), 0);
    return data;
  },
  beforeUpdate: (data) => {
    if (Array.isArray(data.items)) {
      data.totalAmount = data.items.reduce((sum: number, i: { amount: number }) => sum + Number(i.amount || 0), 0);
    }
    return data;
  },
};

export const invoiceResource: CrudConfig = {
  model: Invoice,
  permission: "fees",
  entity: "Invoice",
  labelField: "invoiceNo",
  searchFields: ["invoiceNo", "month", "term"],
  populate: [
    { path: "studentId", select: "firstName lastName admissionNo" },
    { path: "classId", select: "name" },
  ],
  schema: invoiceSchema,
  filter: (p) => {
    const f: Record<string, unknown> = {};
    for (const key of ["status", "studentId", "classId"]) {
      const v = p.get(key);
      if (v) f[key] = v;
    }
    return f;
  },
  beforeCreate: async (data, user) => {
    const subtotal = (data.items || []).reduce((sum: number, i: { amount: number }) => sum + Number(i.amount || 0), 0);
    data.subtotal = subtotal;
    data.total = subtotal - Number(data.discount || 0) + Number(data.fine || 0);
    data.paidAmount = 0;
    data.balance = data.total;
    data.status = "unpaid";
    data.month = data.month || monthKey(new Date());
    if (!data.invoiceNo) data.invoiceNo = await nextSequence(user.organizationId, branchOf(user), "invoice");
    if (data.studentId) {
      const student = await Student.findById(data.studentId).select("classId").lean();
      if (student?.classId) data.classId = student.classId;
    }
    return data;
  },
  beforeUpdate: (data) => {
    if (Array.isArray(data.items)) {
      const subtotal = data.items.reduce((sum: number, i: { amount: number }) => sum + Number(i.amount || 0), 0);
      data.subtotal = subtotal;
      data.total = subtotal - Number(data.discount || 0) + Number(data.fine || 0);
    }
    return data;
  },
  beforeDelete: async (doc) => {
    const { Payment } = await import("@/models");
    const count = await Payment.countDocuments({ invoiceId: doc._id });
    if (count > 0) return "This invoice has recorded payments and cannot be deleted. Cancel it instead.";
    return null;
  },
};

export const expenseResource: CrudConfig = {
  model: Expense,
  permission: "finance",
  entity: "Expense",
  labelField: "description",
  searchFields: ["voucherNo", "description", "paidTo"],
  sort: { date: -1 },
  schema: expenseSchema,
  filter: (p) => (p.get("category") ? { category: p.get("category") } : {}),
  beforeCreate: async (data, user) => {
    if (!data.voucherNo) data.voucherNo = await nextSequence(user.organizationId, branchOf(user), "voucher");
    data.recordedBy = user.id;
    return data;
  },
};

export const employeeResource: CrudConfig = {
  model: Employee,
  permission: "hr",
  entity: "Employee",
  labelField: "employeeNo",
  searchFields: ["firstName", "lastName", "employeeNo", "designation", "department", "email"],
  populate: [{ path: "userId", select: "email role" }],
  schema: employeeSchema,
  filter: (p) => {
    const f: Record<string, unknown> = {};
    for (const key of ["department", "employmentStatus"]) {
      const v = p.get(key);
      if (v) f[key] = v;
    }
    return f;
  },
  beforeCreate: async (data, user) => {
    if (!data.employeeNo) data.employeeNo = await nextSequence(user.organizationId, branchOf(user), "employee");
    return data;
  },
};

export const payrollResource: CrudConfig = {
  model: Payroll,
  permission: "payroll",
  entity: "Payroll",
  searchFields: [],
  populate: [{ path: "employeeId", select: "firstName lastName employeeNo" }],
  filter: (p) => {
    const f: Record<string, unknown> = {};
    for (const key of ["month", "year", "status", "employeeId"]) {
      const v = p.get(key);
      if (v) f[key] = v;
    }
    return f;
  },
  beforeCreate: async (data) => {
    const employee = await Employee.findById(data.employeeId).lean();
    const salary = employee?.salary || ({} as any);
    const allowances =
      Number(salary.houseAllowance || 0) +
      Number(salary.transportAllowance || 0) +
      Number(salary.medicalAllowance || 0) +
      Number(salary.otherAllowance || 0);
    const deductions = Number(salary.taxDeduction || 0) + Number(salary.otherDeduction || 0);
    data.baseSalary = Number(salary.base || 0);
    data.allowances = allowances;
    data.deductions = deductions + Number(data.deductions || 0);
    data.netSalary = data.baseSalary + allowances + Number(data.bonus || 0) - data.deductions;
    return data;
  },
  beforeUpdate: (data) => {
    if (data.netSalary == null && (data.baseSalary != null || data.bonus != null || data.deductions != null)) {
      data.netSalary =
        Number(data.baseSalary || 0) + Number(data.allowances || 0) + Number(data.bonus || 0) - Number(data.deductions || 0);
    }
    return data;
  },
};

export const announcementResource: CrudConfig = {
  model: Announcement,
  permission: "communication",
  entity: "Announcement",
  labelField: "title",
  searchFields: ["title", "body"],
  schema: announcementSchema,
  filter: (p) => {
    const f: Record<string, unknown> = {};
    for (const key of ["status", "audience", "priority"]) {
      const v = p.get(key);
      if (v) f[key] = v;
    }
    return f;
  },
  beforeCreate: (data, user) => {
    if (data.status === "published" && !data.publishedAt) data.publishedAt = new Date();
    data.createdBy = user.id;
    return data;
  },
};

export const eventResource: CrudConfig = {
  model: Event,
  permission: "communication",
  entity: "Event",
  labelField: "title",
  searchFields: ["title", "description", "location"],
  sort: { startDate: 1 },
  beforeCreate: (data, user) => {
    data.createdBy = user.id;
    return data;
  },
};

export const bookResource: CrudConfig = {
  model: LibraryBook,
  permission: "library",
  entity: "Book",
  labelField: "title",
  searchFields: ["title", "author", "isbn", "category"],
  schema: libraryBookSchema,
  filter: (p) => (p.get("category") ? { category: p.get("category") } : {}),
  beforeCreate: (data) => {
    if (data.copiesAvailable == null) data.copiesAvailable = Number(data.copiesTotal || 0);
    return data;
  },
};

export const libraryTransactionResource: CrudConfig = {
  model: LibraryTransaction,
  permission: "library",
  entity: "Library transaction",
  searchFields: [],
  populate: [
    { path: "bookId", select: "title author" },
    { path: "studentId", select: "firstName lastName admissionNo" },
  ],
  filter: (p) => (p.get("status") ? { status: p.get("status") } : {}),
  beforeCreate: async (data, user) => {
    data.issuedBy = user.id;
    data.issueDate = data.issueDate || new Date();
    data.status = "issued";
    if (data.bookId) {
      const book = await LibraryBook.findById(data.bookId).lean();
      if (!book || Number(book.copiesAvailable) <= 0) throw new Error("No copies of this book are available.");
      await LibraryBook.updateOne({ _id: data.bookId }, { $inc: { copiesAvailable: -1 } });
    }
    return data;
  },
  afterChange: async (doc, _user, action) => {
    if (action === "update" && doc.status === "returned" && doc.bookId) {
      await LibraryBook.updateOne({ _id: doc.bookId }, { $inc: { copiesAvailable: 1 } });
    }
  },
};

export const transportRouteResource: CrudConfig = {
  model: TransportRoute,
  permission: "transport",
  entity: "Route",
  labelField: "name",
  searchFields: ["name", "driverName"],
  schema: transportRouteSchema,
  populate: [{ path: "vehicleId", select: "regNo model" }],
};

export const vehicleResource: CrudConfig = {
  model: Vehicle,
  permission: "transport",
  entity: "Vehicle",
  labelField: "regNo",
  searchFields: ["regNo", "model", "driverName"],
  schema: vehicleSchema,
  filter: (p) => (p.get("status") ? { status: p.get("status") } : {}),
};

export const hostelResource: CrudConfig = {
  model: Hostel,
  permission: "hostel",
  entity: "Hostel",
  labelField: "name",
  searchFields: ["name", "wardenName"],
  schema: hostelSchema,
};

export const inventoryResource: CrudConfig = {
  model: InventoryItem,
  permission: "inventory",
  entity: "Inventory item",
  labelField: "name",
  searchFields: ["name", "sku", "supplier"],
  schema: inventoryItemSchema,
  filter: (p) => (p.get("category") ? { category: p.get("category") } : {}),
};

export const visitorResource: CrudConfig = {
  model: Visitor,
  permission: "visitors",
  entity: "Visitor",
  labelField: "name",
  searchFields: ["name", "phone", "purpose", "meetingWith"],
  sort: { checkIn: -1 },
  schema: visitorSchema,
  filter: (p) => (p.get("status") ? { status: p.get("status") } : {}),
};
