export const ObjectIdType = Symbol.for("pgdb.ObjectId");
export const MixedType = Symbol.for("pgdb.Mixed");

export const Types = {
  ObjectId: ObjectIdType,
  Mixed: MixedType,
  String,
  Number,
  Boolean,
  Date,
  Array,
  Object,
  Buffer: Object,
} as const;

export type SchemaOptions = {
  timestamps?: boolean | { createdAt?: string | boolean; updatedAt?: string | boolean };
  versionKey?: boolean | string;
  _id?: boolean;
  toJSON?: { virtuals?: boolean; [key: string]: unknown };
  toObject?: { virtuals?: boolean; [key: string]: unknown };
  [key: string]: unknown;
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class Schema {
  definition: Record<string, any>;
  options: SchemaOptions;
  virtuals: Map<string, (this: any) => any>;
  indexes: [Record<string, unknown>, Record<string, unknown> | undefined][];

  static Types = Types;

  constructor(definition: Record<string, any> = {}, options: SchemaOptions = {}) {
    this.definition = { ...definition };
    this.options = options;
    this.virtuals = new Map();
    this.indexes = [];
  }

  add(definition: Record<string, any>) {
    Object.assign(this.definition, definition);
    return this;
  }

  index(fields: Record<string, unknown>, options?: Record<string, unknown>) {
    this.indexes.push([fields, options]);
    return this;
  }

  virtual(name: string) {
    const self = this;
    return {
      get(getter: (this: any) => any) {
        self.virtuals.set(name, getter);
        return { get: () => undefined };
      },
    };
  }

  path(name: string) {
    const def = this.definition[name];
    const required = Boolean(def && typeof def === "object" && (def.required ?? def.type?.required));
    return {
      isRequired: required,
      path: name,
      instance: def,
    };
  }

  get paths() {
    return this.definition;
  }
}

export type FieldInfo = {
  raw: any;
  type: any;
  isArray: boolean;
  itemDef?: any;
  subSchema?: Schema;
  itemSchema?: Schema;
  hasDefault: boolean;
  defaultVal: any;
  select: boolean;
  required: boolean;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  ref?: string;
};

const OPTION_KEYS = new Set([
  "type",
  "default",
  "required",
  "select",
  "enum",
  "trim",
  "lowercase",
  "uppercase",
  "index",
  "unique",
  "min",
  "max",
  "minlength",
  "maxlength",
  "match",
  "ref",
  "default",
  "immutable",
  "sparse",
  "validate",
  "alias",
  "get",
  "set",
]);

function isTypeMarker(value: any): boolean {
  return (
    value === String ||
    value === Number ||
    value === Boolean ||
    value === Date ||
    value === Object ||
    value === Array ||
    value === Buffer ||
    value === ObjectIdType ||
    value === MixedType
  );
}

function isOptionObject(value: any): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof RegExp) return false;
  if (value instanceof Schema) return false;
  const keys = Object.keys(value);
  if (!keys.length) return false;
  if (keys.includes("type")) return true;
  return keys.every((key) => OPTION_KEYS.has(key));
}

function stripIdOption(definition: Record<string, any>) {
  const copy: Record<string, any> = {};
  for (const [key, value] of Object.entries(definition)) {
    if (key === "_id") continue;
    copy[key] = value;
  }
  return copy;
}

export function fieldInfo(def: any): FieldInfo {
  const info: FieldInfo = {
    raw: def,
    type: undefined,
    isArray: false,
    hasDefault: false,
    defaultVal: undefined,
    select: true,
    required: false,
  };

  if (Array.isArray(def)) {
    info.isArray = true;
    const first = def[0];
    info.itemDef = first;
    if (first instanceof Schema) {
      info.subSchema = first;
    } else if (first && typeof first === "object" && !isTypeMarker(first) && !isOptionObject(first)) {
      info.itemSchema = new Schema(stripIdOption(first), { _id: first._id === true });
    }
    return info;
  }

  if (def instanceof Schema) {
    info.type = "schema";
    info.subSchema = def;
    return info;
  }

  if (isTypeMarker(def)) {
    info.type = def;
    return info;
  }

  if (def && typeof def === "object" && !(def instanceof RegExp)) {
    if (isOptionObject(def)) {
      const base = def.type !== undefined ? fieldInfo(def.type) : fieldInfo(MixedType);
      base.raw = def;
      if ("default" in def) {
        base.hasDefault = true;
        base.defaultVal = def.default;
      }
      if (def.select === false) base.select = false;
      if (def.required) base.required = true;
      if (def.trim) base.trim = true;
      if (def.lowercase) base.lowercase = true;
      if (def.uppercase) base.uppercase = true;
      if (def.ref) base.ref = String(def.ref);
      return base;
    }
    info.type = "nested";
    info.subSchema = new Schema(def, {});
    return info;
  }

  info.type = MixedType;
  return info;
}

export function resolveDefault(value: any): any {
  if (typeof value === "function") {
    try {
      return value();
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(value)) return value.map((item) => resolveDefault(item));
  if (value && typeof value === "object") {
    try {
      return structuredClone(value);
    } catch {
      return { ...value };
    }
  }
  return value;
}

function castScalar(info: FieldInfo, value: any): any {
  if (value === null || value === undefined) return value;
  const type = info.type;
  if (type === Number) {
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  }
  if (type === Boolean) return Boolean(value);
  if (type === Date) return value instanceof Date ? value : new Date(value);
  if (type === String) {
    let str = String(value);
    if (info.trim) str = str.trim();
    if (info.lowercase) str = str.toLowerCase();
    if (info.uppercase) str = str.toUpperCase();
    return str;
  }
  return value;
}

export type ApplyOptions = { isNew?: boolean; newId?: () => string };

export function applyDefaults(
  schema: Schema | undefined,
  input: Record<string, any> | undefined,
  options: ApplyOptions = {}
): Record<string, any> {
  const source = input && typeof input === "object" ? input : {};
  const out: Record<string, any> = { ...source };
  if (!schema || !schema.definition) return out;

  for (const [key, def] of Object.entries(schema.definition)) {
    if (key === "_id") continue;
    const info = fieldInfo(def);
    const provided = out[key] !== undefined;

    if (info.isArray) {
      if (!provided) {
        out[key] = info.hasDefault ? resolveDefault(info.defaultVal) : [];
      }
      if (Array.isArray(out[key])) {
        if (info.subSchema) {
          out[key] = out[key].map((item: any) => {
            const next = applyDefaults(info.subSchema, item, options);
            if (options.isNew && options.newId && info.subSchema!.options._id !== false && !next._id) {
              next._id = options.newId();
            }
            return next;
          });
        } else if (info.itemSchema) {
          out[key] = out[key].map((item: any) => {
            const next = applyDefaults(info.itemSchema, item, options);
            if (options.isNew && options.newId && info.itemSchema!.options._id !== false && !next._id) {
              next._id = options.newId();
            }
            return next;
          });
        }
      }
      continue;
    }

    if (!provided) {
      if (info.hasDefault) {
        out[key] = resolveDefault(info.defaultVal);
      } else if (info.type === "schema" || info.type === "nested") {
        out[key] = applyDefaults(info.subSchema, {}, options);
      }
      if (out[key] === undefined) delete out[key];
      continue;
    }

    if (out[key] === null) continue;

    if ((info.type === "schema" || info.type === "nested") && typeof out[key] === "object") {
      out[key] = applyDefaults(info.subSchema, out[key], options);
      continue;
    }

    out[key] = castScalar(info, out[key]);
  }

  return out;
}

export function validateRequired(schema: Schema | undefined, doc: Record<string, any>) {
  if (!schema || !schema.definition) return;
  for (const [key, def] of Object.entries(schema.definition)) {
    if (key === "_id") continue;
    const info = fieldInfo(def);
    if (!info.required || info.isArray) continue;
    const value = doc[key];
    if (value === undefined || value === null || value === "") {
      throw new ValidationError(`Path \`${key}\` is required.`);
    }
  }
}

export function selectFalseFields(schema: Schema | undefined): Set<string> {
  const result = new Set<string>();
  if (!schema || !schema.definition) return result;
  for (const [key, def] of Object.entries(schema.definition)) {
    const info = fieldInfo(def);
    if (info.select === false) result.add(key);
  }
  return result;
}

export function refForPath(schema: Schema | undefined, path: string): string | null {
  if (!schema) return null;
  let current: Schema | undefined = schema;
  const parts = path.split(".");
  for (let i = 0; i < parts.length; i += 1) {
    if (!current) return null;
    const def = current.definition[parts[i]];
    if (def === undefined) return null;
    const info = fieldInfo(def);
    if (i === parts.length - 1) return info.ref || null;
    if (info.isArray) {
      if (info.subSchema) current = info.subSchema;
      else if (info.itemSchema) current = info.itemSchema;
      else return null;
    } else if (info.subSchema) {
      current = info.subSchema;
    } else {
      return null;
    }
  }
  return null;
}
