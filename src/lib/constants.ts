export const ROLES = [
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
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  principal: "Principal",
  vice_principal: "Vice Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  hr_manager: "HR Manager",
  librarian: "Librarian",
  transport_manager: "Transport Manager",
  parent: "Parent",
  student: "Student",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Organization-wide control across all branches",
  school_admin: "Full administration of a single school branch",
  principal: "Academic leadership, approvals and oversight",
  vice_principal: "Academic operations and discipline",
  teacher: "Classes, attendance, marks and homework",
  accountant: "Fees, invoices, payments and finance",
  hr_manager: "Employees, payroll and staff records",
  librarian: "Library catalog and circulation",
  transport_manager: "Routes, vehicles and transport allocation",
  parent: "Children academics, attendance and fees",
  student: "Personal academics and resources",
};

export const STUDENT_STATUSES = ["active", "inactive", "graduated", "transferred", "left"] as const;
export const ADMISSION_STATUSES = ["pending", "under_review", "approved", "rejected", "waitlisted"] as const;
export const ATTENDANCE_STATUSES = ["present", "absent", "late", "leave"] as const;
export const PAYMENT_METHODS = ["cash", "bank_transfer", "online", "card", "cheque"] as const;
export const INVOICE_STATUSES = ["unpaid", "partial", "paid", "overdue", "cancelled"] as const;
export const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const;
export const EXAM_TYPES = ["quiz", "monthly", "midterm", "final", "practical"] as const;
export const EXAM_STATUSES = ["scheduled", "ongoing", "completed", "published"] as const;
export const ANNOUNCEMENT_AUDIENCES = ["all", "students", "parents", "teachers", "staff", "class"] as const;
export const EMPLOYEE_STATUSES = ["active", "on_leave", "resigned", "terminated"] as const;
export const GENDERS = ["male", "female", "other"] as const;
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export const STATUS_STYLES: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  present: "bg-success/10 text-success border-success/20",
  paid: "bg-success/10 text-success border-success/20",
  approved: "bg-success/10 text-success border-success/20",
  published: "bg-success/10 text-success border-success/20",
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  partial: "bg-warning/10 text-warning border-warning/20",
  late: "bg-warning/10 text-warning border-warning/20",
  under_review: "bg-info/10 text-info border-info/20",
  scheduled: "bg-info/10 text-info border-info/20",
  ongoing: "bg-info/10 text-info border-info/20",
  waitlisted: "bg-info/10 text-info border-info/20",
  unpaid: "bg-destructive/10 text-destructive border-destructive/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  absent: "bg-destructive/10 text-destructive border-destructive/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  inactive: "bg-muted text-muted-foreground border-border",
  graduated: "bg-secondary/10 text-secondary border-secondary/20",
  transferred: "bg-secondary/10 text-secondary border-secondary/20",
  left: "bg-muted text-muted-foreground border-border",
  leave: "bg-secondary/10 text-secondary border-secondary/20",
  on_leave: "bg-warning/10 text-warning border-warning/20",
  resigned: "bg-muted text-muted-foreground border-border",
  terminated: "bg-destructive/10 text-destructive border-destructive/20",
  draft: "bg-muted text-muted-foreground border-border",
  submitted: "bg-info/10 text-info border-info/20",
};

export function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
