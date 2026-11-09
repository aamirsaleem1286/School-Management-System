import { deleteDocument, writeDocument } from "./client";
import type { Schema } from "./schema";

export class Document {
  [key: string]: any;

  constructor(data: Record<string, any>, modelName: string, schema?: Schema) {
    Object.assign(this, data);
    Object.defineProperty(this, "__modelName", { value: modelName, enumerable: false, writable: true });
    Object.defineProperty(this, "__schema", { value: schema, enumerable: false, writable: true });
  }

  toObject(options?: { virtuals?: boolean }): Record<string, any> {
    const out: Record<string, any> = {};
    for (const key of Object.keys(this)) out[key] = this[key];
    if (options?.virtuals) this.applyVirtuals(out);
    return out;
  }

  toJSON(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const key of Object.keys(this)) out[key] = this[key];
    this.applyVirtuals(out);
    return out;
  }

  private applyVirtuals(target: Record<string, any>) {
    const schema = this.__schema as Schema | undefined;
    if (!schema) return;
    for (const [name, getter] of schema.virtuals) {
      try {
        target[name] = getter.call(this);
      } catch {
        target[name] = undefined;
      }
    }
  }

  async save(): Promise<this> {
    const doc: Record<string, any> = {};
    for (const key of Object.keys(this)) doc[key] = this[key];
    const schema = this.__schema as Schema | undefined;
    if (schema?.options?.timestamps) {
      const now = new Date().toISOString();
      if (!doc.createdAt) doc.createdAt = now;
      doc.updatedAt = now;
    }
    await writeDocument(this.__modelName, doc);
    for (const key of Object.keys(this)) delete this[key];
    Object.assign(this, doc);
    return this;
  }

  async deleteOne(): Promise<{ deletedCount: number }> {
    await deleteDocument(this.__modelName, String(this._id));
    return { deletedCount: 1 };
  }
}
