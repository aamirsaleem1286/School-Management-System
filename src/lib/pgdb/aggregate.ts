import { evaluateExpr, toNumber } from "./expr";
import { matches, projectFields, sortDocs } from "./filter";

type Doc = Record<string, any>;

function groupKey(value: any): string {
  if (value === null || value === undefined) return "null";
  if (value instanceof Date) return `date:${value.getTime()}`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `obj:${keys.map((key) => `${key}=${groupKey(value[key])}`).join(",")}`;
  }
  return `${typeof value}:${String(value)}`;
}

function accumulate(accumulator: any, items: Doc[]): any {
  if (!accumulator || typeof accumulator !== "object") return null;
  const [op] = Object.keys(accumulator);
  if (!op) return null;
  const expression = accumulator[op];

  switch (op) {
    case "$sum":
      return items.reduce((total, doc) => total + toNumber(evaluateExpr(expression, doc)), 0);
    case "$avg": {
      const values = items
        .map((doc) => evaluateExpr(expression, doc))
        .filter((value) => value !== null && value !== undefined)
        .map((value) => toNumber(value))
        .filter((value) => !Number.isNaN(value));
      if (!values.length) return null;
      return values.reduce((total, value) => total + value, 0) / values.length;
    }
    case "$min": {
      const values = items.map((doc) => evaluateExpr(expression, doc)).filter((value) => value !== null && value !== undefined);
      if (!values.length) return null;
      return values.reduce((min, value) => (toNumber(value) < toNumber(min) ? value : min));
    }
    case "$max": {
      const values = items.map((doc) => evaluateExpr(expression, doc)).filter((value) => value !== null && value !== undefined);
      if (!values.length) return null;
      return values.reduce((max, value) => (toNumber(value) > toNumber(max) ? value : max));
    }
    case "$first":
      return items.length ? evaluateExpr(expression, items[0]) : null;
    case "$last":
      return items.length ? evaluateExpr(expression, items[items.length - 1]) : null;
    case "$push":
      return items.map((doc) => evaluateExpr(expression, doc));
    case "$addToSet": {
      const seen = new Set<string>();
      const out: any[] = [];
      for (const doc of items) {
        const value = evaluateExpr(expression, doc);
        const key = groupKey(value);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(value);
        }
      }
      return out;
    }
    case "$count":
      return items.length;
    default:
      return null;
  }
}

function groupDocuments(docs: Doc[], spec: Record<string, any>): Doc[] {
  const groups = new Map<string, { key: any; items: Doc[] }>();
  for (const doc of docs) {
    const key = evaluateExpr(spec._id, doc);
    const hash = groupKey(key);
    if (!groups.has(hash)) groups.set(hash, { key, items: [] });
    groups.get(hash)!.items.push(doc);
  }
  return Array.from(groups.values()).map(({ key, items }) => {
    const result: Doc = { _id: key };
    for (const [field, accumulator] of Object.entries(spec)) {
      if (field === "_id") continue;
      result[field] = accumulate(accumulator, items);
    }
    return result;
  });
}

function unwind(docs: Doc[], spec: any): Doc[] {
  const path = typeof spec === "string" ? spec : spec?.path;
  if (!path) return docs;
  const cleanPath = String(path).replace(/^\$/, "");
  const preserve = typeof spec === "object" && spec?.preserveNullAndEmptyArrays;
  const out: Doc[] = [];
  for (const doc of docs) {
    const value = cleanPath.split(".").reduce<any>((acc, key) => (acc == null ? acc : acc[key]), doc);
    if (Array.isArray(value) && value.length) {
      for (const item of value) {
        const next = structuredClone(doc);
        const parts = cleanPath.split(".");
        let current: any = next;
        for (let i = 0; i < parts.length - 1; i += 1) current = current[parts[i]];
        current[parts[parts.length - 1]] = item;
        out.push(next);
      }
    } else if (preserve) {
      out.push(doc);
    }
  }
  return out;
}

export function runPipeline(input: Doc[], pipeline: any[]): Doc[] {
  let docs = input;
  for (const stage of pipeline || []) {
    if (!stage || typeof stage !== "object") continue;
    const [op] = Object.keys(stage);
    const arg = stage[op];
    switch (op) {
      case "$match":
        docs = docs.filter((doc) => matches(doc, arg));
        break;
      case "$sort":
        docs = sortDocs(docs, arg);
        break;
      case "$skip":
        docs = docs.slice(Number(arg) || 0);
        break;
      case "$limit":
        docs = docs.slice(0, Math.max(0, Number(arg) || 0));
        break;
      case "$count":
        docs = [{ [String(arg)]: docs.length }];
        break;
      case "$group":
        docs = groupDocuments(docs, arg);
        break;
      case "$project": {
        const includeOnly = Object.entries(arg).some(([, value]) => value === 1 || value === true);
        docs = docs.map((doc) => {
          if (includeOnly) {
            const included = Object.entries(arg)
              .filter(([key, value]) => key !== "_id" && (value === 1 || value === true))
              .map(([key]) => key);
            const out = projectFields(doc, included);
            if (arg._id !== 0 && arg._id !== false) out._id = doc._id;
            return out;
          }
          const out: Doc = { ...doc };
          for (const [key, value] of Object.entries(arg)) {
            if (value === 0 || value === false) delete out[key];
            else if (key !== "_id") {
              const computed = evaluateExpr(value, doc);
              if (computed !== undefined) out[key] = computed;
            }
          }
          if (arg._id === 0 || arg._id === false) delete out._id;
          return out;
        });
        break;
      }
      case "$addFields":
      case "$set":
        docs = docs.map((doc) => {
          const out: Doc = { ...doc };
          for (const [key, value] of Object.entries(arg)) {
            const computed = evaluateExpr(value, doc);
            if (computed !== undefined) out[key] = computed;
          }
          return out;
        });
        break;
      case "$unset":
        docs = docs.map((doc) => {
          const out: Doc = { ...doc };
          const fields = Array.isArray(arg) ? arg : typeof arg === "string" ? [arg] : Object.keys(arg);
          for (const field of fields) delete out[field];
          return out;
        });
        break;
      case "$unwind":
        docs = unwind(docs, arg);
        break;
      default:
        break;
    }
  }
  return docs;
}
