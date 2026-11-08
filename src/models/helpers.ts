import mongoose, { Schema, type Model } from "mongoose";

export function getModel<T = any>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

export const baseOptions = {
  timestamps: true,
  versionKey: false,
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
