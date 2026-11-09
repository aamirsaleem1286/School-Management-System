export function getPath(obj: any, path: string): any {
  if (obj == null) return undefined;
  if (!path.includes(".")) return obj[path];
  const parts = path.split(".");
  let current: any = obj;
  for (let i = 0; i < parts.length; i += 1) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const rest = parts.slice(i);
      return current.map((item) => getPath(item, rest.join(".")));
    }
    current = current[parts[i]];
  }
  return current;
}

export function setPath(target: Record<string, any>, path: string, value: any) {
  const parts = path.split(".");
  let current: any = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (current[part] == null || typeof current[part] !== "object") current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

export function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toComparable(value: any): number | string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const asDate = Date.parse(value);
    if (!Number.isNaN(asDate) && /^\d{4}-\d{2}-\d{2}T/.test(value)) return asDate;
    const asNumber = Number(value);
    if (value.trim() !== "" && !Number.isNaN(asNumber)) return asNumber;
    return value;
  }
  return String(value);
}

export function compareValues(a: any, b: any): number {
  const left = toComparable(a);
  const right = toComparable(b);
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  const ls = String(left);
  const rs = String(right);
  return ls < rs ? -1 : ls > rs ? 1 : 0;
}

function formatDate(date: any, format: string): string {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return format
    .replace(/%Y/g, String(value.getUTCFullYear()))
    .replace(/%m/g, pad(value.getUTCMonth() + 1))
    .replace(/%d/g, pad(value.getUTCDate()))
    .replace(/%H/g, pad(value.getUTCHours()))
    .replace(/%M/g, pad(value.getUTCMinutes()))
    .replace(/%S/g, pad(value.getUTCSeconds()));
}

function evaluateArgs(arg: any, doc: any): any[] {
  return Array.isArray(arg) ? arg.map((item) => evaluateExpr(item, doc)) : [evaluateExpr(arg, doc)];
}

export function evaluateExpr(expr: any, doc: any): any {
  if (expr === null || expr === undefined) return null;
  if (typeof expr === "string") {
    if (expr.startsWith("$$")) return undefined;
    if (expr.startsWith("$")) return getPath(doc, expr.slice(1));
    return expr;
  }
  if (typeof expr !== "object") return expr;
  if (expr instanceof Date || expr instanceof RegExp) return expr;
  if (Array.isArray(expr)) return expr.map((item) => evaluateExpr(item, doc));

  const keys = Object.keys(expr);
  if (keys.length === 1 && keys[0].startsWith("$")) {
    const op = keys[0];
    const arg = expr[op];
    switch (op) {
      case "$literal":
        return arg;
      case "$add": {
        return evaluateArgs(arg, doc).reduce((sum, value) => sum + toNumber(value), 0);
      }
      case "$subtract": {
        const values = evaluateArgs(arg, doc);
        return toNumber(values[0]) - toNumber(values[1]);
      }
      case "$multiply": {
        return evaluateArgs(arg, doc).reduce((product, value) => product * toNumber(value), 1);
      }
      case "$divide": {
        const values = evaluateArgs(arg, doc);
        const divisor = toNumber(values[1]);
        return divisor === 0 ? null : toNumber(values[0]) / divisor;
      }
      case "$mod": {
        const values = evaluateArgs(arg, doc);
        const divisor = toNumber(values[1]);
        return divisor === 0 ? null : toNumber(values[0]) % divisor;
      }
      case "$sum": {
        if (Array.isArray(arg)) return evaluateArgs(arg, doc).reduce((sum, value) => sum + toNumber(value), 0);
        const value = evaluateExpr(arg, doc);
        if (Array.isArray(value)) return value.reduce((sum, item) => sum + toNumber(item), 0);
        return toNumber(value);
      }
      case "$avg": {
        const values = (Array.isArray(arg) ? evaluateArgs(arg, doc) : [evaluateExpr(arg, doc)]).filter(
          (value) => value !== null && value !== undefined
        );
        if (!values.length) return null;
        return values.reduce((sum, value) => sum + toNumber(value), 0) / values.length;
      }
      case "$min": {
        const values = evaluateArgs(arg, doc).filter((value) => value !== null && value !== undefined);
        if (!values.length) return null;
        return values.reduce((min, value) => (compareValues(value, min) < 0 ? value : min));
      }
      case "$max": {
        const values = evaluateArgs(arg, doc).filter((value) => value !== null && value !== undefined);
        if (!values.length) return null;
        return values.reduce((max, value) => (compareValues(value, max) > 0 ? value : max));
      }
      case "$toInt":
      case "$toDouble":
      case "$toLong":
      case "$toDecimal":
        return toNumber(evaluateExpr(arg, doc));
      case "$toString":
        return String(evaluateExpr(arg, doc) ?? "");
      case "$ifNull": {
        const values = evaluateArgs(arg, doc);
        for (const value of values) {
          if (value !== null && value !== undefined) return value;
        }
        return null;
      }
      case "$cond": {
        if (Array.isArray(arg)) {
          return evaluateExpr(arg[0], doc) ? evaluateExpr(arg[1], doc) : evaluateExpr(arg[2], doc);
        }
        return evaluateExpr(arg.if, doc) ? evaluateExpr(arg.then, doc) : evaluateExpr(arg.else, doc);
      }
      case "$and":
        return (arg as any[]).every((item) => Boolean(evaluateExpr(item, doc)));
      case "$or":
        return (arg as any[]).some((item) => Boolean(evaluateExpr(item, doc)));
      case "$not":
        return !evaluateExpr(arg, doc);
      case "$eq":
        return compareValues(...(evaluateArgs(arg, doc) as [any, any])) === 0;
      case "$ne":
        return compareValues(...(evaluateArgs(arg, doc) as [any, any])) !== 0;
      case "$gt":
        return compareValues(...(evaluateArgs(arg, doc) as [any, any])) > 0;
      case "$gte":
        return compareValues(...(evaluateArgs(arg, doc) as [any, any])) >= 0;
      case "$lt":
        return compareValues(...(evaluateArgs(arg, doc) as [any, any])) < 0;
      case "$lte":
        return compareValues(...(evaluateArgs(arg, doc) as [any, any])) <= 0;
      case "$dateToString": {
        const date = evaluateExpr(arg.date, doc);
        if (date === null || date === undefined) return null;
        return formatDate(date, String(arg.format || "%Y-%m-%d"));
      }
      default:
        return null;
    }
  }

  const out: Record<string, any> = {};
  for (const key of keys) out[key] = evaluateExpr(expr[key], doc);
  return out;
}
