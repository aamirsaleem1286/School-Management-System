import "server-only";
import { Employee, Exam, Invoice, SchoolClass, Section, Student, Subject, User, Vehicle } from "@/models";
import type { SessionUser } from "./auth";
import { branchScope } from "./api";
import type { FieldOption } from "@/components/shared/resource-dialog";

export async function getClassOptions(user: SessionUser): Promise<FieldOption[]> {
  const docs = await SchoolClass.find(branchScope(user)).sort({ level: 1, name: 1 }).select("name").lean();
  return docs.map((d: any) => ({ label: d.name, value: String(d._id) }));
}

export async function getSectionOptions(user: SessionUser, classId?: string): Promise<FieldOption[]> {
  const filter: Record<string, unknown> = branchScope(user);
  if (classId) filter.classId = classId;
  const docs = await Section.find(filter).populate("classId", "name").sort({ name: 1 }).lean();
  return docs.map((d: any) => ({
    label: `${d.classId?.name ? `${d.classId.name} - ` : ""}${d.name}`,
    value: String(d._id),
  }));
}

export async function getSubjectOptions(user: SessionUser): Promise<FieldOption[]> {
  const docs = await Subject.find(branchScope(user)).sort({ name: 1 }).select("name code").lean();
  return docs.map((d: any) => ({ label: `${d.name}${d.code ? ` (${d.code})` : ""}`, value: String(d._id) }));
}

export async function getEmployeeOptions(user: SessionUser): Promise<FieldOption[]> {
  const docs = await Employee.find({ ...branchScope(user), employmentStatus: { $ne: "terminated" } })
    .sort({ firstName: 1 })
    .select("firstName lastName employeeNo")
    .lean();
  return docs.map((d: any) => ({ label: `${d.firstName} ${d.lastName} (${d.employeeNo})`, value: String(d._id) }));
}

export async function getStudentOptions(user: SessionUser, limit = 1000): Promise<FieldOption[]> {
  const docs = await Student.find({ ...branchScope(user), status: "active" })
    .sort({ firstName: 1 })
    .limit(limit)
    .select("firstName lastName admissionNo")
    .lean();
  return docs.map((d: any) => ({ label: `${d.firstName} ${d.lastName} (${d.admissionNo})`, value: String(d._id) }));
}

export async function getInvoiceOptions(user: SessionUser): Promise<FieldOption[]> {
  const docs = await Invoice.find({ ...branchScope(user), status: { $in: ["unpaid", "partial", "overdue"] } })
    .populate("studentId", "firstName lastName admissionNo")
    .sort({ dueDate: 1 })
    .limit(500)
    .lean();
  return docs.map((d: any) => ({
    label: `${d.invoiceNo} - ${d.studentId ? `${d.studentId.firstName} ${d.studentId.lastName}` : ""} - ${d.balance}`,
    value: String(d._id),
  }));
}

export async function getTeacherOptions(user: SessionUser): Promise<FieldOption[]> {
  const docs = await User.find({
    organizationId: user.organizationId,
    role: { $in: ["teacher", "principal", "vice_principal"] },
    status: "active",
  })
    .sort({ name: 1 })
    .select("name email")
    .lean();
  return docs.map((d: any) => ({ label: d.name, value: String(d._id) }));
}

export async function getVehicleOptions(user: SessionUser): Promise<FieldOption[]> {
  const docs = await Vehicle.find(branchScope(user)).sort({ regNo: 1 }).select("regNo model").lean();
  return docs.map((d: any) => ({ label: `${d.regNo}${d.model ? ` (${d.model})` : ""}`, value: String(d._id) }));
}

export async function getExamOptions(user: SessionUser): Promise<FieldOption[]> {
  const docs = await Exam.find(branchScope(user)).sort({ startDate: -1 }).select("name type").lean();
  return docs.map((d: any) => ({ label: d.name, value: String(d._id) }));
}
