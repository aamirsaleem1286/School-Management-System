import { compareValues, evaluateExpr, toNumber } from "./expr";

function isPlainObject(value: any): boolean {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof RegExp);
}

function hasOperatorKeys(value: any): boolean {
  if (!isPlainObject(value)) return false;
  return Object.keys(value).some((key) => key.startsWith("$"));
}

function asTime(value: any): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "number") return value;
  return null;
}

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (a instanceof Date || b instanceof Date) {
    const left = asTime(a);
    const right = asTime(b);
    return left !== null && right !== null && left === right;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual(a[key], b[key]));
  }
  return false;
}

export function scalarEquals(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  if (a instanceof Date || b instanceof Date) {
    const left = asTime(a);
    const right = asTime(b);
    return left !== null && right !== null && left === right;
  }
  if (isPlainObject(a) || isPlainObject(b)) return deepEqual(a, b);
  if (Array.isArray(a) || Array.isArray(b)) return deepEqual(a, b);
  if (typeof a === "number" || typeof b === "number") {
    const left = Number(a);
    const right = Number(b);
    if (Number.isFinite(left) && Number.isFinite(right)) return left === right;
  }
  return String(a) === String(b);
}

function matchRegex(value: any, regex: RegExp): boolean {
  if (typeof value !== "string" && typeof value !== "number") return false;
  const source = String(value);
  if (regex.global || regex.sticky) regex.lastIndex = 0;
  return regex.test(source);
}

function containsValue(value: any, candidate: any): boolean {
  if (Array.isArray(value)) return value.some((item) => scalarEquals(item, candidate) || (Array.isArray(item) && containsValue(item, candidate)));
  return scalarEquals(value, candidate);
}

function matchOperators(value: any, operators: Record<string, any>): boolean {
  for (const [op, operand] of Object.entries(operators)) {
    switch (op) {
      case "$eq":
        if (!matchLeaf(value, operand)) return false;
        break;
      case "$ne":
        if (matchLeaf(value, operand)) return false;
        break;
      case "$in": {
        const list = Array.isArray(operand) ? operand : [operand];
        const values = Array.isArray(value) ? value : [value];
        if (!values.some((item) => list.some((candidate) => scalarEquals(item, candidate)))) return false;
        break;
      }
      case "$nin": {
        const list = Array.isArray(operand) ? operand : [operand];
        const values = Array.isArray(value) ? value : [value];
        if (values.some((item) => list.some((candidate) => scalarEquals(item, candidate)))) return false;
        break;
      }
      case "$gt":
        if (!(compareValues(value, operand) > 0)) return false;
        break;
      case "$gte":
        if (!(compareValues(value, operand) >= 0)) return false;
        break;
      case "$lt":
        if (!(compareValues(value, operand) < 0)) return false;
        break;
      case "$lte":
        if (!(compareValues(value, operand) <= 0)) return false;
        break;
      case "$exists":
        if (Boolean(operand) !== (value !== undefined)) return false;
        break;
      case "$regex": {
        let regex: RegExp;
        if (operand instanceof RegExp) regex = operand;
        else regex = new RegExp(String(operand), String(operators.$options || ""));
        const values = Array.isArray(value) ? value : [value];
        if (!values.some((item) => matchRegex(item, regex))) return false;
        break;
      }
      case "$options":
        break;
      case "$size":
        if (!Array.isArray(value) || value.length !== Number(operand)) return false;
        break;
      case "$all": {
        const list = Array.isArray(operand) ? operand : [operand];
        if (!Array.isArray(value)) return false;
        if (!list.every((candidate) => containsValue(value, candidate))) return false;
        break;
      }
      case "$elemMatch": {
        if (!Array.isArray(value)) return false;
        const matched = value.some((item) => {
          if (hasOperatorKeys(operand)) return matchOperators(item, operand);
          if (isPlainObject(item)) return matches(item, operand);
          return matchLeaf(item, operand);
        });
        if (!matched) return false;
        break;
      }
      case "$not":
        if (matchLeaf(value, operand)) return false;
        break;
      case "$type":
      case "$comment":
      case "$meta":
        break;
      default:
        return false;
    }
  }
  return true;
}

export function matchLeaf(value: any, condition: any): boolean {
  if (condition instanceof RegExp) {
    const values = Array.isArray(value) ? value : [value];
    return values.some((item) => matchRegex(item, condition));
  }
  if (Array.isArray(condition)) {
    if (Array.isArray(value) && value.length === condition.length && condition.every((item, index) => scalarEquals(value[index], item))) {
      return true;
    }
    const values = Array.isArray(value) ? value : [value];
    return condition.some((candidate) => values.some((item) => scalarEquals(item, candidate)));
  }
  if (hasOperatorKeys(condition)) return matchOperators(value, condition);
  if (Array.isArray(value)) return value.some((item) => scalarEquals(item, condition));
  return scalarEquals(value, condition);
}

function valuesAt(obj: any, parts: string[]): any[] {
  if (obj === null || obj === undefined) return [];
  if (parts.length === 0) return [obj];
  if (Array.isArray(obj)) return obj.flatMap((item) => valuesAt(item, parts));
  const [head, ...rest] = parts;
  return valuesAt(obj[head], rest);
}

export function matches(doc: any, filter: any): boolean {
  if (!filter || typeof filter !== "object") return true;
  for (const [key, condition] of Object.entries(filter)) {
    if (key === "$or") {
      const list = Array.isArray(condition) ? condition : [condition];
      if (!list.some((item) => matches(doc, item))) return false;
      continue;
    }
    if (key === "$and") {
      const list = Array.isArray(condition) ? condition : [condition];
      if (!list.every((item) => matches(doc, item))) return false;
      continue;
    }
    if (key === "$nor") {
      const list = Array.isArray(condition) ? condition : [condition];
      if (list.some((item) => matches(doc, item))) return false;
      continue;
    }
    if (key === "$expr") {
      if (!evaluateExpr(condition, doc)) return false;
      continue;
    }
    if (key.startsWith("$")) continue;

    const values = valuesAt(doc, key.split("."));
    if (!values.length) {
      if (!matchLeaf(undefined, condition)) return false;
      continue;
    }
    if (!values.some((value) => matchLeaf(value, condition))) return false;
  }
  return true;
}

export function sortDocs<T extends Record<string, any>>(docs: T[], spec: Record<string, 1 | -1 | number> | undefined): T[] {
  if (!spec) return docs;
  const entries = Object.entries(spec).filter(([, direction]) => direction === 1 || direction === -1);
  if (!entries.length) return docs;
  return [...docs].sort((a, b) => {
    for (const [field, direction] of entries) {
      const left = valuesAt(a, field.split("."))[0];
      const right = valuesAt(b, field.split("."))[0];
      const result = compareValues(left, right);
      if (result !== 0) return result * (direction as number);
    }
    return 0;
  });
}

function pickPath(source: any, path: string, out: any) {
  const parts = path.split(".");
  let current = source;
  for (let i = 0; i < parts.length; i += 1) {
    if (current === null || current === undefined) return;
    if (Array.isArray(current)) {
      const rest = parts.slice(i);
      const mapped = current.map((item) => {
        const nested: any = {};
        pickPath(item, rest.join("."), nested);
        return nested;
      });
      setNested(out, parts.slice(0, i), mapped);
      return;
    }
    current = current[parts[i]];
  }
  setNested(out, parts, current);
}

function setNested(out: any, parts: string[], value: any) {
  if (!parts.length) return;
  let current = out;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (current[part] === null || typeof current[part] !== "object") current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

export function projectFields(doc: Record<string, any>, select: string | string[] | undefined): Record<string, any> {
  if (!doc) return doc;
  const tokens = (Array.isArray(select) ? select.join(" ") : String(select || ""))
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return doc;

  const plus = tokens.filter((token) => token.startsWith("+")).map((token) => token.slice(1));
  const minus = tokens.filter((token) => token.startsWith("-")).map((token) => token.slice(1));
  const plain = tokens.filter((token) => !token.startsWith("+") && !token.startsWith("-"));

  if (plain.length) {
    const out: Record<string, any> = {};
    const includesId = plain.includes("_id");
    if (includesId) out._id = doc._id;
    for (const field of plain) {
      if (field === "_id") continue;
      pickPath(doc, field, out);
    }
    return out;
  }

  const out: Record<string, any> = { ...doc };
  for (const field of minus) {
    delete out[field];
    delete out[field.split(".")[0]];
  }
  if (plus.length) {
    for (const field of plus) {
      if (doc[field] !== undefined) out[field] = doc[field];
    }
  }
  return out;
}

export function sumField(docs: Record<string, any>[], field: string): number {
  return docs.reduce((total, doc) => total + toNumber(doc[field]), 0);
}
