import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalId = z.union([objectId, z.literal(""), z.null()]).optional();
const date = z.coerce.date();

export const studentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.enum(["male", "female", "other"]),
  dob: date,
  admissionNo: z.string().optional(),
  rollNo: z.string().optional(),
  bloodGroup: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  classId: optionalId,
  sectionId: optionalId,
  academicYearId: optionalId,
  status: z.enum(["active", "inactive", "graduated", "transferred", "left"]).optional(),
  admissionDate: date.optional(),
  photo: z.string().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  previousSchool: z.string().optional(),
  notes: z.string().optional(),
  guardian: z
    .object({
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      guardianName: z.string().optional(),
      relation: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      occupation: z.string().optional(),
      cnic: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({ name: z.string().optional(), relation: z.string().optional(), phone: z.string().optional() })
    .optional(),
});

export const admissionSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(["male", "female", "other"]),
  dob: date,
  classAppliedId: optionalId,
  academicYearId: optionalId,
  guardianName: z.string().min(1),
  relation: z.string().optional(),
  phone: z.string().min(5),
  email: z.string().optional(),
  address: z.string().optional(),
  previousSchool: z.string().optional(),
  previousPercentage: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export const admissionReviewSchema = z.object({
  status: z.enum(["pending", "under_review", "approved", "rejected", "waitlisted"]),
  notes: z.string().optional(),
});

export const classSchema = z.object({
  name: z.string().min(1),
  level: z.coerce.number().optional(),
  stream: z.string().optional(),
  capacity: z.coerce.number().min(1).optional(),
});

export const sectionSchema = z.object({
  classId: objectId,
  name: z.string().min(1),
  capacity: z.coerce.number().min(1).optional(),
  classTeacherId: optionalId,
  room: z.string().optional(),
});

export const subjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  classIds: z.array(objectId).optional(),
  isElective: z.boolean().optional(),
  maxMarks: z.coerce.number().min(1).optional(),
});

export const attendanceBulkSchema = z.object({
  date: date,
  personType: z.enum(["student", "staff"]).default("student"),
  classId: optionalId,
  sectionId: optionalId,
  source: z.enum(["manual", "qr", "barcode", "biometric", "rfid"]).optional(),
  records: z.array(
    z.object({
      personId: objectId,
      status: z.enum(["present", "absent", "late", "leave"]),
      remarks: z.string().optional(),
    })
  ),
});

export const examSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["quiz", "monthly", "midterm", "final", "practical"]),
  startDate: date,
  endDate: date,
  classIds: z.array(objectId).optional(),
  academicYearId: optionalId,
  status: z.enum(["scheduled", "ongoing", "completed", "published"]).optional(),
});

export const marksBulkSchema = z.object({
  examId: objectId,
  subjectId: objectId,
  classId: optionalId,
  sectionId: optionalId,
  totalMarks: z.coerce.number().min(1),
  records: z.array(
    z.object({
      studentId: objectId,
      obtainedMarks: z.coerce.number().min(0),
      remarks: z.string().optional(),
    })
  ),
});

export const feeStructureSchema = z.object({
  name: z.string().min(1),
  classId: objectId,
  academicYearId: optionalId,
  items: z
    .array(
      z.object({
        category: z.string().min(1),
        amount: z.coerce.number().min(0),
        frequency: z.enum(["monthly", "term", "annual", "one-time"]),
      })
    )
    .min(1),
  dueDay: z.coerce.number().min(1).max(28).optional(),
  lateFeePerDay: z.coerce.number().min(0).optional(),
});

export const invoiceSchema = z.object({
  studentId: objectId,
  feeStructureId: optionalId,
  items: z
    .array(z.object({ description: z.string().min(1), amount: z.coerce.number().min(0) }))
    .min(1),
  discount: z.coerce.number().min(0).optional(),
  fine: z.coerce.number().min(0).optional(),
  dueDate: date,
  month: z.string().optional(),
  term: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  invoiceId: objectId,
  amount: z.coerce.number().min(1),
  method: z.enum(["cash", "bank_transfer", "online", "card", "cheque"]),
  reference: z.string().optional(),
  paidAt: date.optional(),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.coerce.number().min(1),
  date: date,
  paidTo: z.string().optional(),
  method: z.enum(["cash", "bank_transfer", "cheque", "online"]).optional(),
});

export const employeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  designation: z.string().min(1),
  department: z.string().min(1),
  qualification: z.string().optional(),
  experienceYears: z.coerce.number().min(0).optional(),
  joinDate: date.optional(),
  contractType: z.enum(["permanent", "contract", "visiting", "probation"]).optional(),
  employmentStatus: z.enum(["active", "on_leave", "resigned", "terminated"]).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  cnic: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  salary: z
    .object({
      base: z.coerce.number().min(0).optional(),
      houseAllowance: z.coerce.number().min(0).optional(),
      transportAllowance: z.coerce.number().min(0).optional(),
      medicalAllowance: z.coerce.number().min(0).optional(),
      otherAllowance: z.coerce.number().min(0).optional(),
      taxDeduction: z.coerce.number().min(0).optional(),
      otherDeduction: z.coerce.number().min(0).optional(),
    })
    .optional(),
});

export const payrollSchema = z.object({
  employeeId: objectId,
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
  bonus: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(["all", "students", "parents", "teachers", "staff", "class"]).optional(),
  classIds: z.array(objectId).optional(),
  priority: z.enum(["normal", "high", "urgent"]).optional(),
  status: z.enum(["draft", "scheduled", "published"]).optional(),
  scheduledAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  channels: z.array(z.enum(["in_app", "email", "whatsapp", "sms"])).optional(),
});

export const leaveSchema = z.object({
  applicantType: z.enum(["student", "staff"]).default("student"),
  studentId: optionalId,
  employeeId: optionalId,
  fromDate: date,
  toDate: date,
  type: z.string().optional(),
  reason: z.string().min(3),
});

export const leaveReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  remarks: z.string().optional(),
});

export const libraryBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  isbn: z.string().optional(),
  category: z.string().optional(),
  copiesTotal: z.coerce.number().min(0),
  shelf: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
});

export const libraryIssueSchema = z.object({
  bookId: objectId,
  borrowerType: z.enum(["student", "staff"]).default("student"),
  studentId: optionalId,
  employeeId: optionalId,
  dueDate: date,
});

export const transportRouteSchema = z.object({
  name: z.string().min(1),
  fee: z.coerce.number().min(0).optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  vehicleId: optionalId,
  stops: z.array(z.object({ name: z.string(), time: z.string().optional() })).optional(),
});

export const vehicleSchema = z.object({
  regNo: z.string().min(1),
  model: z.string().optional(),
  capacity: z.coerce.number().min(0).optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  status: z.enum(["active", "maintenance", "retired"]).optional(),
});

export const hostelSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["boys", "girls", "mixed"]).optional(),
  wardenName: z.string().optional(),
  wardenPhone: z.string().optional(),
  fee: z.coerce.number().min(0).optional(),
  rooms: z.array(z.object({ roomNo: z.string(), capacity: z.coerce.number().min(1) })).optional(),
});

export const inventoryItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.coerce.number().min(0),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  reorderLevel: z.coerce.number().min(0).optional(),
  supplier: z.string().optional(),
});

export const visitorSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  purpose: z.string().min(1),
  meetingWith: z.string().optional(),
  idProof: z.string().optional(),
  badgeNo: z.string().optional(),
});

export const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum([
    "super_admin",
    "school_admin",
    "principal",
    "vice_principal",
    "teacher",
    "accountant",
    "hr_manager",
    "librarian",
    "transport_manager",
    "parent",
    "student",
  ]),
  phone: z.string().optional(),
  branchId: optionalId,
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  extraPermissions: z.array(z.string()).optional(),
  deniedPermissions: z.array(z.string()).optional(),
});

export const settingsSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  modules: z.record(z.string(), z.boolean()).optional(),
  lateFeePerDay: z.coerce.number().min(0).optional(),
});

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(`${first.path.join(".") || "Input"}: ${first.message}`);
  }
  return result.data;
}
