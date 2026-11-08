"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FieldOption = { label: string; value: string };

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "time" | "textarea" | "select" | "checkbox" | "password" | "hidden" | "json";
  placeholder?: string;
  options?: FieldOption[];
  required?: boolean;
  defaultValue?: string | number | boolean;
  help?: string;
  colSpan?: 1 | 2;
  step?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
};

type Values = Record<string, unknown>;

function getPath(obj: Values, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc as Values | undefined)?.[key], obj);
}

function setPath(obj: Values, path: string, value: unknown): Values {
  const keys = path.split(".");
  const next: Values = { ...obj };
  let cursor: Values = next;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) cursor[key] = value;
    else {
      cursor[key] = { ...((cursor[key] as Values) || {}) };
      cursor = cursor[key] as Values;
    }
  });
  return next;
}

function normalizeInitial(initial: Values = {}): Values {
  const out: Values = {};
  for (const [k, v] of Object.entries(initial)) {
    if (v instanceof Date) out[k] = v.toISOString().slice(0, 10);
    else if (v && typeof v === "object" && !Array.isArray(v) && !("_id" in (v as object))) {
      out[k] = normalizeInitial(v as Values);
    } else if (v && typeof v === "object" && "_id" in (v as object)) out[k] = String((v as { _id: unknown })._id);
    else out[k] = v;
  }
  return out;
}

export function ResourceDialog({
  label,
  title,
  description,
  endpoint,
  method = "POST",
  fields,
  initial,
  submitLabel,
  redirect,
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
  icon,
  size = "md",
  onSuccess,
}: {
  label: string;
  title?: string;
  description?: string;
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT";
  fields: FieldDef[];
  initial?: Values;
  submitLabel?: string;
  redirect?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [values, setValues] = React.useState<Values>({});

  React.useEffect(() => {
    if (open) {
      const base = normalizeInitial(initial || {});
      const withDefaults: Values = {};
      for (const f of fields) {
        if (f.type === "hidden") continue;
        const existing = getPath(base, f.name);
        withDefaults[f.name] = existing !== undefined ? existing : f.defaultValue ?? (f.type === "checkbox" ? false : "");
      }
      setValues(withDefaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (name: string, value: unknown) => setValues((prev) => setPath(prev, name, value));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Values = {};
      for (const f of fields) {
        if (f.type === "hidden") {
          payload[f.name] = f.defaultValue;
          continue;
        }
        let value = getPath(values, f.name);
        if (typeof value === "string") value = value.trim();
        if (value === "" || value === undefined || value === null) continue;
        if (f.type === "json" && typeof value === "string") {
          try {
            value = JSON.parse(value);
          } catch {
            throw new Error(`${f.label} must be valid JSON`);
          }
        }
        if (f.type === "number") value = Number(value);
        if (f.type === "checkbox") value = Boolean(value);
        setPath(payload, f.name, value);
      }
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the record");
      toast.success(data.message || "Saved successfully");
      setOpen(false);
      onSuccess?.();
      if (redirect) router.push(redirect);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={triggerClassName}>
          {icon ?? <Plus className="h-4 w-4" />}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          size === "sm" && "max-w-md",
          size === "md" && "max-w-2xl",
          size === "lg" && "max-w-4xl"
        )}
      >
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title || label}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="mt-5 grid max-h-[65vh] grid-cols-1 gap-4 overflow-y-auto px-0.5 sm:grid-cols-2">
            {fields
              .filter((f) => f.type !== "hidden")
              .map((f) => {
                const value = getPath(values, f.name);
                return (
                  <div key={f.name} className={cn("space-y-1.5", (f.colSpan === 2 || f.type === "textarea") && "sm:col-span-2")}>
                    <Label htmlFor={`${endpoint}-${f.name}`} className="flex items-center gap-1">
                      {f.label}
                      {f.required ? <span className="text-destructive">*</span> : null}
                    </Label>
                    {f.type === "select" ? (
                      <Select value={value === "" || value === undefined ? undefined : String(value)} onValueChange={(v) => set(f.name, v)} disabled={f.disabled}>
                        <SelectTrigger id={`${endpoint}-${f.name}`}>
                          <SelectValue placeholder={f.placeholder || `Select ${f.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.type === "textarea" || f.type === "json" ? (
                      <Textarea
                        id={`${endpoint}-${f.name}`}
                        value={f.type === "json" && typeof value !== "string" ? JSON.stringify(value ?? [], null, 2) : String(value ?? "")}
                        onChange={(e) => set(f.name, e.target.value)}
                        placeholder={f.placeholder}
                        disabled={f.disabled}
                        rows={f.type === "json" ? 6 : 3}
                        className={f.type === "json" ? "font-mono text-xs" : undefined}
                      />
                    ) : f.type === "checkbox" ? (
                      <label className="flex h-10 items-center gap-2 rounded-lg border border-input px-3 text-sm">
                        <Checkbox checked={Boolean(value)} onCheckedChange={(c) => set(f.name, Boolean(c))} disabled={f.disabled} />
                        {f.placeholder || "Yes"}
                      </label>
                    ) : (
                      <Input
                        id={`${endpoint}-${f.name}`}
                        type={f.type || "text"}
                        value={String(value ?? "")}
                        onChange={(e) => set(f.name, e.target.value)}
                        placeholder={f.placeholder}
                        required={f.required}
                        step={f.step}
                        min={f.min}
                        max={f.max}
                        disabled={f.disabled}
                        autoComplete="off"
                      />
                    )}
                    {f.help ? <p className="text-[11px] text-muted-foreground">{f.help}</p> : null}
                  </div>
                );
              })}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitLabel || "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

