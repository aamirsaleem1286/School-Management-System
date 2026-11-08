"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO = [
  { label: "Super Admin", email: "superadmin@school.edu" },
  { label: "School Admin", email: "admin@school.edu" },
  { label: "Principal", email: "principal@school.edu" },
  { label: "Teacher", email: "teacher@school.edu" },
  { label: "Accountant", email: "accountant@school.edu" },
  { label: "Parent", email: "parent@school.edu" },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = React.useState("superadmin@school.edu");
  const [password, setPassword] = React.useState("Admin@123");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to sign in");
      toast.success("Welcome back!");
      router.replace(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Email address
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu"
            className="h-12 rounded-xl bg-muted/40 pl-10 shadow-none focus-visible:bg-background"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Password
          </Label>
          <Link href="/forgot-password" className="text-xs font-medium text-secondary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-12 rounded-xl bg-muted/40 pl-10 pr-11 shadow-none focus-visible:bg-background"
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="group h-12 w-full rounded-xl bg-gradient-to-r from-secondary to-indigo-600 text-white shadow-lg shadow-secondary/25 hover:from-secondary hover:to-indigo-500"
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Sign in securely
        {!loading ? <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
      </Button>

      <div className="space-y-2.5 pt-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-secondary" /> One-click demo accounts
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword("Admin@123");
              }}
              className="truncate rounded-lg border bg-muted/40 px-2 py-2 text-[11px] font-medium text-muted-foreground transition-all hover:-translate-y-px hover:border-secondary/50 hover:bg-secondary/5 hover:text-secondary"
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">All demo accounts use the password Admin@123</p>
      </div>
    </form>
  );
}
