import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  invert = false,
  href = "/dashboard",
  className,
}: {
  compact?: boolean;
  invert?: boolean;
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl shadow-sm",
          invert ? "bg-white/10 text-white ring-1 ring-white/20" : "bg-primary text-primary-foreground"
        )}
      >
        <GraduationCap className="h-5 w-5" />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display text-sm font-bold tracking-tight", invert ? "text-white" : "text-foreground")}>
            AI Solution IT
          </span>
          <span className={cn("mt-1 text-[10px] font-medium uppercase tracking-[0.18em]", invert ? "text-white/60" : "text-muted-foreground")}>
            School ERP
          </span>
        </span>
      ) : null}
    </Link>
  );
}
