import { Schema } from "@/lib/pgdb";
import { baseOptions, getModel, ref } from "./helpers";

const salarySchema = new Schema(
  {
    base: { type: Number, default: 0 },
    houseAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    otherAllowance: { type: Number, default: 0 },
    taxDeduction: { type: Number, default: 0 },
    otherDeduction: { type: Number, default: 0 },
  },
  { _id: false }
);

const employeeSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    employeeNo: { type: String, required: true },
    userId: { ...ref("User"), default: null },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    designation: { type: String, required: true },
    department: { type: String, required: true, index: true },
    qualification: { type: String, default: "" },
    experienceYears: { type: Number, default: 0 },
    joinDate: { type: Date, default: Date.now },
    contractType: { type: String, enum: ["permanent", "contract", "visiting", "probation"], default: "permanent" },
    employmentStatus: {
      type: String,
      enum: ["active", "on_leave", "resigned", "terminated"],
      default: "active",
      index: true,
    },
    salary: { type: salarySchema, default: () => ({}) },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    cnic: { type: String, default: "" },
    dob: { type: Date, default: null },
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    photo: { type: String, default: "" },
    bankAccount: { type: String, default: "" },
  },
  baseOptions
);
employeeSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});
employeeSchema.index({ branchId: 1, employeeNo: 1 }, { unique: true });
employeeSchema.index({ firstName: "text", lastName: "text", employeeNo: "text" });

const payrollSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    employeeId: { ...ref("Employee"), required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    baseSalary: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "approved", "paid"], default: "draft", index: true },
    paidAt: { type: Date, default: null },
    processedBy: { ...ref("User"), default: null },
    notes: { type: String, default: "" },
  },
  baseOptions
);
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

export const Employee = getModel("Employee", employeeSchema);
export const Payroll = getModel("Payroll", payrollSchema);
