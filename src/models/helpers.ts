import type { Model } from "mongoose";
import { Schema, model as registerModel } from "@/lib/pgdb";

export function getModel<T = Record<string, any>>(name: string, schema: any): Model<T> {
  return registerModel(name, schema) as unknown as Model<T>;
}

export const baseOptions = {
  timestamps: true,
  versionKey: false as const,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
};

export const ref = (model: string) => ({ type: Schema.Types.ObjectId, ref: model });

export function moneySchema(prefix = "") {
  return {
    [`${prefix}base`]: { type: Number, default: 0 },
    [`${prefix}allowances`]: { type: Number, default: 0 },
    [`${prefix}deductions`]: { type: Number, default: 0 },
  };
}
