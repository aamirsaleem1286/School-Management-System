import { Badge } from "@/components/ui/badge";
import { STATUS_STYLES, titleCase } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const style = STATUS_STYLES[status] || "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("capitalize", style, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {titleCase(status)}
    </Badge>
  );
}
