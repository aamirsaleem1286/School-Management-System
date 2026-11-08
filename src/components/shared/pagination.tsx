import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toQuery } from "@/lib/utils";

export function Pagination({
  page,
  pages,
  total,
  limit,
  basePath,
  params = {},
}: {
  page: number;
  pages: number;
  total: number;
  limit: number;
  basePath: string;
  params?: Record<string, string | number | undefined | null>;
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const link = (p: number) => `${basePath}${toQuery({ ...params, page: p })}`;
  const windowStart = Math.max(1, Math.min(page - 2, pages - 4));
  const windowEnd = Math.min(pages, windowStart + 4);
  const pageNumbers = [];
  for (let p = windowStart; p <= windowEnd; p++) pageNumbers.push(p);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}</span>&ndash;
        <span className="font-medium text-foreground">{end}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={link(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            "flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-muted",
            page <= 1 && "pointer-events-none opacity-40"
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </Link>
        {pageNumbers.map((p) => (
          <Link
            key={p}
            href={link(p)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors hover:bg-muted",
              p === page && "border-primary bg-primary text-primary-foreground hover:bg-primary"
            )}
          >
            {p}
          </Link>
        ))}
        <Link
          href={link(Math.min(pages, page + 1))}
          aria-disabled={page >= pages}
          className={cn(
            "flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-muted",
            page >= pages && "pointer-events-none opacity-40"
          )}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
