"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import { cn, formatDateTime, initials } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { filterNavigation, NAV_SECTIONS } from "@/config/navigation";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type ShellUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  permissions: string[];
  activeBranchId: string | null;
};

export type ShellBranch = { id: string; name: string; code: string; isMain: boolean };
export type ShellNotification = { id: string; title: string; body: string; link: string; isRead: boolean; createdAt: string };

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

function useActiveHref() {
  const pathname = usePathname();
  return React.useMemo(() => {
    const matches = ALL_ITEMS.filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
    return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
  }, [pathname]);
}

export function AppShell({
  user,
  branches,
  notifications,
  organizationName,
  academicYear,
  children,
}: {
  user: ShellUser;
  branches: ShellBranch[];
  notifications: ShellNotification[];
  organizationName: string;
  academicYear?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = useActiveHref();
  const sections = React.useMemo(() => filterNavigation(user.permissions), [user.permissions]);
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem("sms_sidebar_collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem("sms_sidebar_collapsed", c ? "0" : "1");
      return !c;
    });
  }

  const activeBranch = branches.find((b) => b.id === user.activeBranchId);
  const unread = notifications.filter((n) => !n.isRead).length;
  const currentTitle = ALL_ITEMS.find((i) => i.href === activeHref)?.label || "Dashboard";
  const isSuperAdmin = user.role === "super_admin";

  async function switchBranch(branchId: string | null) {
    setSwitching(true);
    try {
      const res = await fetch("/api/auth/switch-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not switch branch");
      toast.success(branchId ? "Branch switched" : "Showing all branches");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSwitching(false);
    }
  }

  async function markAllRead() {
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    if (res.ok) router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-16 items-center border-b border-sidebar-border px-4", collapsed ? "justify-center" : "justify-between")}>
        <Logo compact={collapsed} invert />
        {!collapsed ? (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/50">
            {academicYear || "ERP"}
          </span>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed ? (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted/70">
                {section.label}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.href === activeHref;
                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-accent" : "text-sidebar-muted group-hover:text-white")} />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    {!collapsed && active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                  </Link>
                );
                return collapsed ? (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={toggleCollapsed}
          className={cn(
            "hidden w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white lg:flex",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed ? "Collapse sidebar" : null}
        </button>
        {!collapsed ? (
          <p className="mt-1 px-2 text-[10px] text-sidebar-muted/60">© {new Date().getFullYear()} AI Solution IT</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border transition-[width] duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-[264px]"
        )}
      >
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] border-r border-sidebar-border shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden min-w-0 flex-col sm:flex">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{organizationName}</span>
            <h2 className="truncate font-display text-sm font-semibold">{currentTitle}</h2>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button className="mr-1 hidden items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:border-secondary/40 md:flex">
              <Search className="h-3.5 w-3.5" />
              <span>Search…</span>
              <kbd className="ml-6 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
            </button>

            {branches.length > 1 || isSuperAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={switching}>
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden max-w-[130px] truncate sm:inline">
                      {activeBranch ? activeBranch.name : isSuperAdmin ? "All branches" : "Branch"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>Active branch</DropdownMenuLabel>
                  {isSuperAdmin ? (
                    <DropdownMenuItem onClick={() => switchBranch(null)}>
                      <Building2 className="text-muted-foreground" />
                      <span className="flex-1">All branches</span>
                      {!user.activeBranchId ? <Check className="text-secondary" /> : null}
                    </DropdownMenuItem>
                  ) : null}
                  {branches.map((b) => (
                    <DropdownMenuItem key={b.id} onClick={() => switchBranch(b.id)}>
                      <Building2 className="text-muted-foreground" />
                      <span className="flex-1 truncate">
                        {b.name}
                        {b.isMain ? <span className="ml-1 text-[10px] text-muted-foreground">(Main)</span> : null}
                      </span>
                      {user.activeBranchId === b.id ? <Check className="text-secondary" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {unread > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Notifications</p>
                    <p className="text-[11px] text-muted-foreground">{unread} unread</p>
                  </div>
                  {unread > 0 ? (
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-[11px]">
                      Mark all read
                    </Button>
                  ) : null}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-10 text-center text-xs text-muted-foreground">You are all caught up.</p>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <Link
                        key={n.id}
                        href={n.link || "/announcements"}
                        className={cn(
                          "flex gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/60",
                          !n.isRead && "bg-secondary/[0.04]"
                        )}
                      >
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.isRead ? "bg-muted-foreground/30" : "bg-secondary")} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{n.title}</p>
                          {n.body ? <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{n.body}</p> : null}
                          <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-0.5 flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-muted">
                  <Avatar className="h-8 w-8">
                    {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                    <AvatarFallback className="bg-primary text-[11px] text-primary-foreground">{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[110px] truncate text-xs font-semibold leading-tight">{user.name}</span>
                    <span className="block text-[10px] leading-tight text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
