"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FilterDef = {
  name: string;
  label: string;
  options: { label: string; value: string }[];
};

export function SearchFilterBar({
  placeholder = "Search...",
  filters = [],
  extra,
}: {
  placeholder?: string;
  filters?: FilterDef[];
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(searchParams.get("q") || "");

  React.useEffect(() => {
    setValue(searchParams.get("q") || "");
  }, [searchParams]);

  const update = React.useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "" || v === "all") params.delete(k);
        else params.set(k, v);
      }
      params.delete("page");
      router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [pathname, router, searchParams]
  );

  React.useEffect(() => {
    const current = searchParams.get("q") || "";
    if (value === current) return;
    const t = setTimeout(() => update({ q: value || undefined }), 350);
    return () => clearTimeout(t);
  }, [value, searchParams, update]);

  const hasFilters = Array.from(searchParams.keys()).some((k) => k !== "page" && k !== "limit");

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {filters.map((filter) => (
        <Select
          key={filter.name}
          value={searchParams.get(filter.name) || "all"}
          onValueChange={(v) => update({ [filter.name]: v })}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{filter.label}: All</SelectItem>
            {filter.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {extra}
      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(pathname)}
          className="text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" /> Reset
        </Button>
      ) : null}
    </div>
  );
}
