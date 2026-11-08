import {
  BarChart3,
  BookOpen,
  Bus,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  DoorOpen,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  Library,
  Megaphone,
  Package,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Academics",
    items: [
      { label: "Students", href: "/students", icon: Users, permission: "students.view" },
      { label: "Admissions", href: "/admissions", icon: UserPlus, permission: "admissions.view" },
      { label: "Attendance", href: "/attendance", icon: CalendarCheck2, permission: "attendance.view" },
      { label: "Classes", href: "/academics/classes", icon: GraduationCap, permission: "academics.view" },
      { label: "Subjects", href: "/academics/subjects", icon: BookOpen, permission: "academics.view" },
      { label: "Timetable", href: "/academics/timetable", icon: CalendarDays, permission: "academics.view" },
      { label: "Homework", href: "/academics/homework", icon: ClipboardList, permission: "academics.view" },
      { label: "Examinations", href: "/exams", icon: FileText, permission: "exams.view" },
      { label: "Marks", href: "/exams/marks", icon: FileSpreadsheet, permission: "marks.view" },
      { label: "Report Cards", href: "/exams/report-cards", icon: ScrollText, permission: "exams.view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Fee Structures", href: "/fees", icon: Wallet, permission: "fees.view" },
      { label: "Invoices", href: "/fees/invoices", icon: Receipt, permission: "fees.view" },
      { label: "Payments", href: "/fees/payments", icon: CreditCard, permission: "fees.view" },
      { label: "Expenses", href: "/finance/expenses", icon: FileSpreadsheet, permission: "finance.view" },
      { label: "Payroll", href: "/finance/payroll", icon: Wallet, permission: "payroll.view" },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Employees", href: "/hr", icon: UserCog, permission: "hr.view" },
      { label: "Leave Requests", href: "/hr/leave", icon: CalendarCheck2, permission: "hr.view" },
      { label: "Announcements", href: "/announcements", icon: Megaphone, permission: "communication.view" },
      { label: "Events", href: "/events", icon: CalendarDays, permission: "communication.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Library", href: "/library", icon: Library, permission: "library.view" },
      { label: "Transport", href: "/transport", icon: Bus, permission: "transport.view" },
      { label: "Hostel", href: "/hostel", icon: Home, permission: "hostel.view" },
      { label: "Inventory", href: "/inventory", icon: Package, permission: "inventory.view" },
      { label: "Visitors", href: "/visitors", icon: DoorOpen, permission: "visitors.view" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports.view" },
      { label: "Audit Logs", href: "/audit", icon: ShieldCheck, permission: "audit.view" },
      { label: "Settings", href: "/settings", icon: Settings, permission: "settings.view" },
    ],
  },
  {
    label: "Portal",
    items: [{ label: "My Portal", href: "/portal", icon: GraduationCap, permission: "portal.view" }],
  },
];

export function filterNavigation(permissions: string[]): NavSection[] {
  const allow = (p?: string) => !p || permissions.includes("*") || permissions.includes(p);
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => allow(item.permission)),
  })).filter((section) => section.items.length > 0);
}
