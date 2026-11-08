import type { Role } from "./constants";

export const PERMISSION_GROUPS = {
  students: { label: "Students", actions: ["view", "create", "update", "delete", "export"] },
  admissions: { label: "Admissions", actions: ["view", "create", "update", "delete", "approve"] },
  attendance: { label: "Attendance", actions: ["view", "create", "update", "delete", "export"] },
  academics: { label: "Academics", actions: ["view", "create", "update", "delete"] },
  exams: { label: "Examinations", actions: ["view", "create", "update", "delete", "approve", "publish"] },
  marks: { label: "Marks", actions: ["view", "create", "update", "approve"] },
  fees: { label: "Fees", actions: ["view", "create", "update", "delete", "collect", "export"] },
  finance: { label: "Finance", actions: ["view", "create", "update", "delete", "export"] },
  hr: { label: "HR & Staff", actions: ["view", "create", "update", "delete", "export"] },
  payroll: { label: "Payroll", actions: ["view", "create", "update", "approve"] },
  communication: { label: "Communication", actions: ["view", "create", "update", "delete"] },
  reports: { label: "Reports", actions: ["view", "export"] },
  settings: { label: "Settings", actions: ["view", "update", "manage_users", "manage_modules"] },
  library: { label: "Library", actions: ["view", "create", "update", "delete"] },
  transport: { label: "Transport", actions: ["view", "create", "update", "delete"] },
  hostel: { label: "Hostel", actions: ["view", "create", "update", "delete"] },
  inventory: { label: "Inventory", actions: ["view", "create", "update", "delete"] },
  visitors: { label: "Visitors", actions: ["view", "create", "update", "delete"] },
  audit: { label: "Audit Logs", actions: ["view"] },
  portal: { label: "Portal", actions: ["view"] },
} as const;

export type PermissionModule = keyof typeof PERMISSION_GROUPS;
export type PermissionAction = (typeof PERMISSION_GROUPS)[PermissionModule]["actions"][number];

export const ALL_PERMISSIONS: string[] = Object.entries(PERMISSION_GROUPS).flatMap(([module, def]) =>
  def.actions.map((action) => `${module}.${action}`)
);

const ALL = ALL_PERMISSIONS;

const VIEW_ALL = ALL.filter((p) => p.endsWith(".view"));

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ["*"],
  school_admin: ["*"],
  principal: [
    ...VIEW_ALL,
    "students.create",
    "students.update",
    "students.export",
    "admissions.approve",
    "admissions.update",
    "attendance.create",
    "attendance.update",
    "attendance.export",
    "academics.create",
    "academics.update",
    "exams.create",
    "exams.update",
    "exams.approve",
    "exams.publish",
    "marks.approve",
    "marks.update",
    "fees.export",
    "finance.export",
    "hr.export",
    "communication.create",
    "communication.update",
    "reports.export",
    "settings.view",
    "library.view",
    "transport.view",
    "hostel.view",
    "inventory.view",
    "visitors.view",
    "audit.view",
  ],
  vice_principal: [
    ...VIEW_ALL,
    "students.update",
    "admissions.approve",
    "attendance.create",
    "attendance.update",
    "exams.update",
    "marks.approve",
    "communication.create",
    "reports.export",
  ],
  teacher: [
    "students.view",
    "attendance.view",
    "attendance.create",
    "attendance.update",
    "academics.view",
    "exams.view",
    "marks.view",
    "marks.create",
    "marks.update",
    "communication.view",
    "communication.create",
    "reports.view",
    "library.view",
    "portal.view",
  ],
  accountant: [
    "students.view",
    "fees.view",
    "fees.create",
    "fees.update",
    "fees.delete",
    "fees.collect",
    "fees.export",
    "finance.view",
    "finance.create",
    "finance.update",
    "finance.delete",
    "finance.export",
    "payroll.view",
    "hr.view",
    "reports.view",
    "reports.export",
    "communication.view",
  ],
  hr_manager: [
    "hr.view",
    "hr.create",
    "hr.update",
    "hr.delete",
    "hr.export",
    "payroll.view",
    "payroll.create",
    "payroll.update",
    "payroll.approve",
    "attendance.view",
    "attendance.create",
    "attendance.update",
    "attendance.export",
    "students.view",
    "communication.view",
    "communication.create",
    "reports.view",
    "reports.export",
    "audit.view",
  ],
  librarian: [
    "students.view",
    "library.view",
    "library.create",
    "library.update",
    "library.delete",
    "communication.view",
  ],
  transport_manager: [
    "students.view",
    "transport.view",
    "transport.create",
    "transport.update",
    "transport.delete",
    "communication.view",
  ],
  parent: ["portal.view", "communication.view"],
  student: ["portal.view", "communication.view"],
};

export function rolePermissions(role: Role): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(permissions: string[], required: string): boolean {
  if (permissions.includes("*")) return true;
  return permissions.includes(required);
}

export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  if (permissions.includes("*")) return true;
  return required.some((r) => permissions.includes(r));
}

export function resolvePermissions(
  role: Role,
  extra: string[] = [],
  denied: string[] = []
): string[] {
  if (role === "super_admin" || role === "school_admin") return ["*"];
  const base = new Set(rolePermissions(role));
  extra.forEach((p) => base.add(p));
  denied.forEach((p) => base.delete(p));
  return Array.from(base);
}
