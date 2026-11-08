import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Inbox } from "lucide-react";

export function DataTable({
  headers,
  rows,
  empty = "No records found",
  emptyHint,
  className,
  rowKey,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  empty?: string;
  emptyHint?: string;
  className?: string;
  rowKey?: (index: number) => string | number;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-card", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {headers.map((h, i) => (
              <TableHead key={`${h}-${i}`}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={headers.length} className="h-56">
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Inbox className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{empty}</p>
                  {emptyHint ? <p className="max-w-sm text-xs text-muted-foreground">{emptyHint}</p> : null}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, ri) => (
              <TableRow key={rowKey ? rowKey(ri) : ri}>
                {row.map((cell, ci) => (
                  <TableCell key={ci}>{cell}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
