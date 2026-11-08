import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ArrowUpRight,
  CalendarCheck2,
  GraduationCap,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  { icon: Users, title: "Admissions & Students", text: "One record from enquiry to alumni." },
  { icon: CalendarCheck2, title: "Attendance & Timetable", text: "Daily registers with instant alerts." },
  { icon: LineChart, title: "Fees & Finance", text: "Invoices, receipts and real-time dues." },
  { icon: ShieldCheck, title: "Secure by design", text: "Role-based access across branches." },
];

const STATS = [
  { value: "120+", label: "Schools" },
  { value: "10k+", label: "Students" },
  { value: "99.9%", label: "Uptime" },
];

export default function LoginPage() {
  return (
    <div className="auth-aurora relative min-h-screen overflow-hidden">
      <div className="auth-grid pointer-events-none absolute inset-0" />
      <div className="auth-orb left-[-10%] top-[-12%] h-[26rem] w-[26rem] bg-indigo-600/30" />
      <div className="auth-orb auth-orb-2 right-[-8%] top-[8%] h-[22rem] w-[22rem] bg-teal-400/20" />
      <div className="auth-orb auth-orb-3 bottom-[-18%] left-[28%] h-[28rem] w-[28rem] bg-blue-600/25" />
      <div className="auth-noise pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1.1fr_460px] lg:gap-16 lg:px-12">
        <div className="hidden lg:flex lg:flex-col">
          <Logo invert href="/login" />

          <div className="mt-14 max-w-xl space-y-7 xl:mt-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-teal-300" />
              The complete school operating system
            </div>

            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white xl:text-[52px]">
              Every part of your school,{" "}
              <span className="bg-gradient-to-r from-teal-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                beautifully connected.
              </span>
            </h1>

            <p className="text-[15px] leading-relaxed text-white/60">
              Admissions, attendance, exams, fees, payroll, library, transport and parent communication — one
              secure workspace for your entire campus.
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-5 pt-2">
              {HIGHLIGHTS.map((h) => (
                <div key={h.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur">
                    <h.icon className="h-4 w-4 text-teal-300" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{h.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/50">{h.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-8 border-t border-white/10 pt-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="font-display text-xl font-bold text-white">{s.value}</p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 flex items-center gap-3 text-xs text-white/40">
            <span className="h-px w-8 bg-white/15" />
            Built by AI Solution IT · Secure multi-branch ERP
          </div>
        </div>

        <div className="mx-auto w-full max-w-[440px] lg:mx-0">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo invert href="/login" />
          </div>

          <div className="mb-4 hidden items-center justify-end gap-2 text-[11px] font-medium text-white/50 lg:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            All systems operational
          </div>

          <div className="relative">
            <div className="absolute -inset-px rounded-[26px] bg-gradient-to-b from-white/25 via-white/5 to-transparent" />
            <div className="relative rounded-[24px] border border-white/60 bg-card p-6 shadow-[0_30px_80px_-24px_rgba(2,6,23,0.8)] sm:p-8 dark:border-white/10">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-indigo-600 text-white shadow-lg shadow-secondary/30">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    AI Solution IT
                  </p>
                  <h2 className="font-display text-xl font-bold tracking-tight">Sign in to your workspace</h2>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4 text-secondary" />
                Use your school credentials to continue.
              </p>

              <div className="mt-6">
                <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted" />}>
                  <LoginForm />
                </Suspense>
              </div>

              <div className="mt-6 flex items-center justify-center gap-1.5 border-t pt-5 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                Protected by enterprise-grade encryption
              </div>
            </div>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1 text-center text-[11px] text-white/40 lg:hidden">
            Need an account? Contact your school administrator
            <ArrowUpRight className="h-3 w-3" />
          </p>
        </div>
      </div>
    </div>
  );
}
