import { deleteDocument, ensureSchema, readCollection, writeDocument, writeDocuments } from "./client";
import { Document } from "./document";
import { getPath, setPath, toNumber } from "./expr";
import { applyDefaults, refForPath, Schema, selectFalseFields, validateRequired } from "./schema";
import { matches, projectFields, sortDocs } from "./filter";
import { runPipeline } from "./aggregate";

type AnyDoc = Record<string, any>;

const HEX = "0123456789abcdef";

export function newObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");
  let random = "";
  for (let i = 0; i < 16; i += 1) random += HEX[Math.floor(Math.random() * 16)];
  return timestamp + random;
}

function isOperatorObject(value: any): boolean {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.keys(value).some((key) => key.startsWith("$"));
}

function selectionToString(select: any): string | null {
  if (!select) return null;
  if (typeof select === "string") return select;
  if (Array.isArray(select)) return select.join(" ");
  if (typeof select === "object") {
    const tokens: string[] = [];
    for (const [key, value] of Object.entries(select)) {
      if (key === "_id") continue;
      if (value === 1 || value === true) tokens.push(key);
      else if (value === 0 || value === false) tokens.push(`-${key}`);
    }
    return tokens.join(" ");
  }
  return null;
}

function applySelect(doc: AnyDoc, select: string | null, schema?: Schema): AnyDoc {
  if (!doc) return doc;
  const hidden = selectFalseFields(schema);
  if (!select) {
    if (!hidden.size) return doc;
    const out = { ...doc };
    for (const field of hidden) delete out[field];
    return out;
  }
  const tokens = select.split(/\s+/).filter(Boolean);
  const plus = tokens.filter((token) => token.startsWith("+")).map((token) => token.slice(1));
  const plain = tokens.filter((token) => !token.startsWith("+") && !token.startsWith("-"));
  if (plain.length) return projectFields(doc, select);
  const out = { ...doc };
  for (const field of hidden) {
    if (!plus.includes(field)) delete out[field];
  }
  for (const token of tokens) {
    if (token.startsWith("-")) {
      const field = token.slice(1);
      delete out[field];
      delete out[field.split(".")[0]];
    }
  }
  for (const field of plus) {
    if (doc[field] !== undefined) out[field] = doc[field];
  }
  return out;
}

function unsetPath(target: AnyDoc, path: string) {
  const parts = path.split(".");
  let current: any = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (current == null || typeof current !== "object") return;
    current = current[parts[i]];
  }
  if (current && typeof current === "object") delete current[parts[parts.length - 1]];
}

export function applyUpdate(doc: AnyDoc, update: AnyDoc, inserted: boolean): AnyDoc {
  if (!update || typeof update !== "object") return doc;
  const keys = Object.keys(update);
  const isOperatorUpdate = keys.some((key) => key.startsWith("$"));
  if (!isOperatorUpdate) {
    const id = doc._id;
    for (const key of Object.keys(doc)) {
      if (key !== "_id") delete doc[key];
    }
    Object.assign(doc, update);
    doc._id = id;
    return doc;
  }
  for (const [op, value] of Object.entries(update)) {
    if (op === "$set" || (op === "$setOnInsert" && inserted)) {
      for (const [path, next] of Object.entries(value as AnyDoc)) setPath(doc, path, next);
    } else if (op === "$inc") {
      for (const [path, next] of Object.entries(value as AnyDoc)) {
        setPath(doc, path, toNumber(getPath(doc, path)) + toNumber(next));
      }
    } else if (op === "$unset") {
      for (const path of Object.keys(value as AnyDoc)) unsetPath(doc, path);
    } else if (op === "$push") {
      for (const [path, next] of Object.entries(value as AnyDoc)) {
        const current = getPath(doc, path);
        const list = Array.isArray(current) ? [...current] : [];
        if (next && typeof next === "object" && !Array.isArray(next) && "$each" in next) {
          list.push(...(next.$each as any[]));
        } else {
          list.push(next);
        }
        setPath(doc, path, list);
      }
    } else if (op === "$addToSet") {
      for (const [path, next] of Object.entries(value as AnyDoc)) {
        const current = getPath(doc, path);
        const list = Array.isArray(current) ? [...current] : [];
        const values = next && typeof next === "object" && !Array.isArray(next) && "$each" in next ? (next.$each as any[]) : [next];
        for (const item of values) {
          if (!list.some((existing) => JSON.stringify(existing) === JSON.stringify(item))) list.push(item);
        }
        setPath(doc, path, list);
      }
    } else if (op === "$pull") {
      for (const [path, next] of Object.entries(value as AnyDoc)) {
        const current = getPath(doc, path);
        if (!Array.isArray(current)) continue;
        setPath(
          doc,
          path,
          current.filter((item) => JSON.stringify(item) !== JSON.stringify(next))
        );
      }
    } else if (op === "$pop") {
      for (const [path, next] of Object.entries(value as AnyDoc)) {
        const current = getPath(doc, path);
        if (!Array.isArray(current)) continue;
        setPath(doc, path, Number(next) === -1 ? current.slice(1) : current.slice(0, -1));
      }
    }
  }
  return doc;
}

export const models: Record<string, any> = (globalThis as any).__pgdbModels ?? ((globalThis as any).__pgdbModels = {});

function timestampsEnabled(schema: Schema): boolean {
  return Boolean(schema?.options?.timestamps);
}

function prepareDocument(schema: Schema, input: AnyDoc, isNew: boolean): AnyDoc {
  let doc = { ...(input || {}) };
  doc = applyDefaults(schema, doc, { isNew, newId: newObjectId });
  if (isNew && !doc._id) doc._id = newObjectId();
  if (isNew) validateRequired(schema, doc);
  if (timestampsEnabled(schema)) {
    const now = new Date().toISOString();
    if (isNew && !doc.createdAt) doc.createdAt = now;
    doc.updatedAt = now;
  }
  return doc;
}

async function populateInto(
  model: any,
  docs: AnyDoc[],
  populate: { path: string; select?: string }
) {
  const refName = model.__refFor(populate.path);
  if (!refName) return;
  const target = models[refName];
  if (!target) return;
  const rows = await readCollection(refName);
  const map = new Map<string, AnyDoc>();
  for (const row of rows) map.set(String(row._id), row);
  const parts = populate.path.split(".");
  for (const doc of docs) populatePath(doc, parts, map, populate.select);
}

function populatePath(doc: AnyDoc, parts: string[], map: Map<string, AnyDoc>, select?: string) {
  if (!doc) return;
  const [head, ...rest] = parts;
  if (rest.length) {
    const value = doc[head];
    if (Array.isArray(value)) {
      for (const item of value) populatePath(item, rest, map, select);
    } else if (value && typeof value === "object") {
      populatePath(value, rest, map, select);
    }
    return;
  }
  const value = doc[head];
  const resolveOne = (item: any) => {
    if (item === null || item === undefined) return null;
    if (typeof item === "object") return item;
    const found = map.get(String(item));
    if (!found) return null;
    return select ? projectFields(found, select) : found;
  };
  doc[head] = Array.isArray(value) ? value.map(resolveOne) : resolveOne(value);
}

class PromiseQuery {
  protected promiseCache: Promise<any> | null = null;

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null): Promise<any | TResult> {
    return this.run().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<any> {
    return this.run().finally(onfinally);
  }

  protected run(): Promise<any> {
    if (!this.promiseCache) this.promiseCache = this.execute();
    return this.promiseCache;
  }

  exec(): Promise<any> {
    return this.run();
  }

  protected async execute(): Promise<any> {
    return null;
  }
}

class OpQuery extends PromiseQuery {
  private leanMode: boolean;

  constructor(private readonly runner: (lean: boolean) => Promise<any>, lean = false) {
    super();
    this.leanMode = lean;
  }

  lean(value = true): this {
    this.leanMode = value;
    return this;
  }

  select(): this {
    return this;
  }

  populate(): this {
    return this;
  }

  protected execute(): Promise<any> {
    return this.runner(this.leanMode);
  }
}

class ModelQuery extends PromiseQuery {
  private sortSpec: AnyDoc | null = null;
  private skipCount = 0;
  private limitCount = 0;
  private selectSpec: string | null = null;
  private populateSpecs: { path: string; select?: string }[] = [];
  private leanMode = false;

  constructor(
    private readonly model: any,
    private readonly filter: AnyDoc,
    private readonly projection: any,
    private readonly many: boolean
  ) {
    super();
  }

  sort(spec: AnyDoc): this {
    this.sortSpec = spec;
    return this;
  }

  skip(count: number): this {
    this.skipCount = Number(count) || 0;
    return this;
  }

  limit(count: number): this {
    this.limitCount = Number(count) || 0;
    return this;
  }

  select(spec: any): this {
    this.selectSpec = selectionToString(spec);
    return this;
  }

  populate(path: string, select?: string): this {
    this.populateSpecs.push({ path, select });
    return this;
  }

  lean(value = true): this {
    this.leanMode = value;
    return this;
  }

  protected async execute(): Promise<any> {
    await ensureSchema();
    const rows = await readCollection(this.model.modelName);
    let docs = rows.filter((row) => matches(row, this.filter || {}));
    if (this.sortSpec) docs = sortDocs(docs, this.sortSpec);
    if (this.many) {
      if (this.skipCount) docs = docs.slice(this.skipCount);
      if (this.limitCount) docs = docs.slice(0, this.limitCount);
    } else if (this.limitCount) {
      docs = docs.slice(0, this.limitCount);
    }
    for (const populate of this.populateSpecs) await populateInto(this.model, docs, populate);
    const select = this.selectSpec ?? selectionToString(this.projection);
    docs = docs.map((doc) => applySelect(doc, select, this.model.schema));
    if (this.leanMode) return this.many ? docs : docs[0] ?? null;
    const hydrated = docs.map((doc) => new Document(doc, this.model.modelName, this.model.schema));
    return this.many ? hydrated : hydrated[0] ?? null;
  }
}

export function buildModel(name: string, schema: Schema) {
  const model: any = {
    modelName: name,
    schema,
    collection: { name },
    __refFor(path: string) {
      return refForPath(schema, path);
    },

    find(filter: AnyDoc = {}, projection?: any) {
      return new ModelQuery(model, filter, projection, true);
    },

    findOne(filter: AnyDoc = {}, projection?: any) {
      return new ModelQuery(model, filter, projection, false);
    },

    findById(id: any, projection?: any) {
      return new ModelQuery(model, { _id: id }, projection, false);
    },

    findOneAndUpdate(filter: AnyDoc, update: AnyDoc, options: AnyDoc = {}) {
      return new OpQuery((lean) => model.__findOneAndUpdate(filter, update, { ...options, lean }), Boolean(options.lean));
    },

    findByIdAndUpdate(id: any, update: AnyDoc, options: AnyDoc = {}) {
      return new OpQuery((lean) => model.__findOneAndUpdate({ _id: id }, update, { ...options, lean }), Boolean(options.lean));
    },

    findOneAndDelete(filter: AnyDoc, options: AnyDoc = {}) {
      return new OpQuery(() => model.__findOneAndDelete(filter, options));
    },

    findByIdAndDelete(id: any, options: AnyDoc = {}) {
      return new OpQuery(() => model.__findOneAndDelete({ _id: id }, options));
    },

    async __findOneAndUpdate(filter: AnyDoc, update: AnyDoc, options: AnyDoc = {}) {
      await ensureSchema();
      const rows = await readCollection(name);
      const found = rows.find((row) => matches(row, filter || {}));
      let doc: AnyDoc;
      let inserted = false;

      if (found) {
        doc = { ...found };
      } else if (options.upsert) {
        inserted = true;
        doc = { _id: newObjectId() };
        for (const [key, value] of Object.entries(filter || {})) {
          if (key.startsWith("$") || isOperatorObject(value)) continue;
          setPath(doc, key, value);
        }
      } else {
        return null;
      }

      const before = { ...doc };
      applyUpdate(doc, update, inserted);
      if (inserted) {
        doc = applyDefaults(schema, doc, { isNew: true, newId: newObjectId });
        if (!doc._id) doc._id = newObjectId();
        validateRequired(schema, doc);
      }
      if (timestampsEnabled(schema)) {
        doc.updatedAt = new Date().toISOString();
        if (inserted && !doc.createdAt) doc.createdAt = doc.updatedAt;
      }
      await writeDocument(name, doc);
      const result = options.new === false && !inserted ? before : doc;
      return options.lean ? result : new Document(result, name, schema);
    },

    async __findOneAndDelete(filter: AnyDoc, options: AnyDoc = {}) {
      await ensureSchema();
      const rows = await readCollection(name);
      const found = rows.find((row) => matches(row, filter || {}));
      if (!found) return null;
      await deleteDocument(name, String(found._id));
      return options.lean ? found : new Document(found, name, schema);
    },

    async create(input: AnyDoc | AnyDoc[]) {
      await ensureSchema();
      if (Array.isArray(input)) {
        const docs = input.map((item) => prepareDocument(schema, item, true));
        await writeDocuments(name, docs);
        return docs.map((doc) => new Document(doc, name, schema));
      }
      const doc = prepareDocument(schema, input, true);
      await writeDocument(name, doc);
      return new Document(doc, name, schema);
    },

    async insertMany(input: AnyDoc[], _options?: AnyDoc) {
      await ensureSchema();
      const docs = (input || []).map((item) => prepareDocument(schema, item, true));
      await writeDocuments(name, docs);
      return docs.map((doc) => new Document(doc, name, schema));
    },

    async countDocuments(filter: AnyDoc = {}) {
      await ensureSchema();
      const rows = await readCollection(name);
      return rows.filter((row) => matches(row, filter || {})).length;
    },

    async estimatedDocumentCount() {
      await ensureSchema();
      return (await readCollection(name)).length;
    },

    async distinct(field: string, filter: AnyDoc = {}) {
      await ensureSchema();
      const rows = await readCollection(name);
      const seen = new Set<string>();
      const values: any[] = [];
      for (const row of rows) {
        if (!matches(row, filter || {})) continue;
        const value = getPath(row, field);
        const list = Array.isArray(value) ? value : [value];
        for (const item of list) {
          if (item === undefined || item === null) continue;
          const key = `${typeof item}:${String(item)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          values.push(item);
        }
      }
      return values;
    },

    async updateOne(filter: AnyDoc, update: AnyDoc, options: AnyDoc = {}) {
      const result = await model.__findOneAndUpdate(filter, update, { ...options, new: true });
      return {
        acknowledged: true,
        matchedCount: result ? 1 : 0,
        modifiedCount: result ? 1 : 0,
        upsertedId: options.upsert && result ? String(result._id) : null,
      };
    },

    async updateMany(filter: AnyDoc, update: AnyDoc) {
      await ensureSchema();
      const rows = await readCollection(name);
      const target = rows.filter((row) => matches(row, filter || {}));
      const next = target.map((row) => {
        const doc = { ...row };
        applyUpdate(doc, update, false);
        if (timestampsEnabled(schema)) doc.updatedAt = new Date().toISOString();
        return doc;
      });
      if (next.length) await writeDocuments(name, next);
      return { acknowledged: true, matchedCount: target.length, modifiedCount: next.length };
    },

    async deleteOne(filter: AnyDoc) {
      const rows = await readCollection(name);
      const found = rows.find((row) => matches(row, filter || {}));
      if (!found) return { acknowledged: true, deletedCount: 0 };
      await deleteDocument(name, String(found._id));
      return { acknowledged: true, deletedCount: 1 };
    },

    async deleteMany(filter: AnyDoc = {}) {
      await ensureSchema();
      const rows = await readCollection(name);
      const target = rows.filter((row) => matches(row, filter || {}));
      for (const row of target) await deleteDocument(name, String(row._id));
      return { acknowledged: true, deletedCount: target.length };
    },

    async bulkWrite(operations: AnyDoc[]) {
      let inserted = 0;
      let matched = 0;
      for (const operation of operations || []) {
        if (operation.insertOne) {
          await model.create(operation.insertOne.document);
          inserted += 1;
        } else if (operation.updateOne) {
          await model.__findOneAndUpdate(operation.updateOne.filter, operation.updateOne.update, {
            upsert: operation.updateOne.upsert,
          });
          matched += 1;
        } else if (operation.updateMany) {
          await model.updateMany(operation.updateMany.filter, operation.updateMany.update);
          matched += 1;
        } else if (operation.deleteOne) {
          await model.deleteOne(operation.deleteOne.filter);
        } else if (operation.deleteMany) {
          await model.deleteMany(operation.deleteMany.filter);
        }
      }
      return { ok: 1, insertedCount: inserted, matchedCount: matched };
    },

    aggregate(pipeline: AnyDoc[]) {
      return new OpQuery(async () => {
        await ensureSchema();
        const rows = await readCollection(name);
        return runPipeline(rows, pipeline);
      });
    },

    async exists(filter: AnyDoc = {}) {
      await ensureSchema();
      const rows = await readCollection(name);
      return rows.some((row) => matches(row, filter || {})) ? { _id: null } : null;
    },
  };

  return model;
}

export function createModel(name: string, schema: Schema) {
  if (models[name]) return models[name];
  const model = buildModel(name, schema);
  models[name] = model;
  return model;
}
