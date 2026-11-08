import { Schema } from "mongoose";
import { baseOptions, getModel, ref } from "./helpers";

const gradingRowSchema = new Schema(
  {
    grade: { type: String, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    gpa: { type: Number, required: true },
    remarks: { type: String, default: "" },
  },
  { _id: false }
);

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "Pakistan" },
    currency: { type: String, default: "PKR" },
    locale: { type: String, default: "en-PK" },
    timezone: { type: String, default: "Asia/Karachi" },
    primaryColor: { type: String, default: "#0B1B3A" },
    isActive: { type: Boolean, default: true },
    settings: {
      gradingScale: { type: [gradingRowSchema], default: [] },
      lateFeePerDay: { type: Number, default: 0 },
      invoicePrefix: { type: String, default: "INV" },
      receiptPrefix: { type: String, default: "RCP" },
      admissionPrefix: { type: String, default: "ADM" },
      employeePrefix: { type: String, default: "EMP" },
      modules: {
        library: { type: Boolean, default: true },
        transport: { type: Boolean, default: true },
        hostel: { type: Boolean, default: false },
        inventory: { type: Boolean, default: true },
        lms: { type: Boolean, default: false },
        health: { type: Boolean, default: true },
        canteen: { type: Boolean, default: false },
        visitors: { type: Boolean, default: true },
        alumni: { type: Boolean, default: false },
      },
      languages: { type: [String], default: ["en", "ur", "ms"] },
    },
  },
  baseOptions
);

const branchSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    principalName: { type: String, default: "" },
    isMain: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    settings: {
      modules: { type: Schema.Types.Mixed, default: {} },
    },
  },
  baseOptions
);
branchSchema.index({ organizationId: 1, code: 1 }, { unique: true });

const settingSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), default: null, index: true },
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
  },
  baseOptions
);
settingSchema.index({ organizationId: 1, branchId: 1, key: 1 }, { unique: true });

export const Organization = getModel("Organization", organizationSchema);
export const Branch = getModel("Branch", branchSchema);
export const Setting = getModel("Setting", settingSchema);
