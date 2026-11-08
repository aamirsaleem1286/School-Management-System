import mongoose, { Schema, type Model } from "mongoose";

export function getModel<T = Record<string, any>>(name: string, schema: any): Model<T> {
  return ((mongoose.models && mongoose.models[name]) ? (mongoose.models[name] as Model<T>) : (mongoose.model(name, schema) as unknown as Model<T>));
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
