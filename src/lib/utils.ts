import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null, currency = "PKR", locale = "en-PK") {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function formatNumber(value: number | undefined | null) {
  return Number(value || 0).toLocaleString();
}

export function formatDate(date: Date | string | undefined | null, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", opts ?? { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(date: Date | string | undefined | null) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export function startOfDay(date: Date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function monthKey(date: Date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function calculateGrade(percentage: number, scale: GradingScale = DEFAULT_GRADING_SCALE) {
  const row = scale.find((s) => percentage >= s.min && percentage <= s.max);
  return row ?? scale[scale.length - 1];
}

export type GradingScale = { grade: string; min: number; max: number; gpa: number; remarks: string }[];

export const DEFAULT_GRADING_SCALE: GradingScale = [
  { grade: "A+", min: 90, max: 100, gpa: 4.0, remarks: "Outstanding" },
  { grade: "A", min: 80, max: 89, gpa: 3.7, remarks: "Excellent" },
  { grade: "B", min: 70, max: 79, gpa: 3.3, remarks: "Very Good" },
  { grade: "C", min: 60, max: 69, gpa: 3.0, remarks: "Good" },
  { grade: "D", min: 50, max: 59, gpa: 2.5, remarks: "Satisfactory" },
  { grade: "E", min: 40, max: 49, gpa: 2.0, remarks: "Needs Improvement" },
  { grade: "F", min: 0, max: 39, gpa: 0, remarks: "Fail" },
];

export function getInitialsColor(seed: string) {
  const colors = [
    "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
    "bg-teal-500/15 text-teal-600 dark:text-teal-300",
    "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % colors.length;
  return colors[hash];
}

export function toQuery(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function safeJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function monthName(month: number) {
  return new Date(2000, month - 1, 1).toLocaleDateString("en-US", { month: "long" });
}
