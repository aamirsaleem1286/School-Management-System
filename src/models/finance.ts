import { Schema } from "@/lib/pgdb";
import { baseOptions, getModel, ref } from "./helpers";

const feeStructureSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    academicYearId: { ...ref("AcademicYear"), default: null },
    classId: { ...ref("SchoolClass"), required: true, index: true },
    name: { type: String, required: true },
    items: [
      {
        category: { type: String, required: true },
        amount: { type: Number, required: true },
        frequency: { type: String, enum: ["monthly", "term", "annual", "one-time"], default: "monthly" },
      },
    ],
    totalAmount: { type: Number, default: 0 },
    dueDay: { type: Number, default: 10 },
    lateFeePerDay: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  baseOptions
);
feeStructureSchema.index({ branchId: 1, classId: 1, academicYearId: 1 });

const invoiceSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    invoiceNo: { type: String, required: true },
    studentId: { ...ref("Student"), required: true, index: true },
    academicYearId: { ...ref("AcademicYear"), default: null },
    classId: { ...ref("SchoolClass"), default: null, index: true },
    items: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    fine: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    dueDate: { type: Date, required: true },
    month: { type: String, default: "" },
    term: { type: String, default: "" },
    status: {
      type: String,
      enum: ["unpaid", "partial", "paid", "overdue", "cancelled"],
      default: "unpaid",
      index: true,
    },
    notes: { type: String, default: "" },
    createdBy: { ...ref("User"), default: null },
  },
  baseOptions
);
invoiceSchema.index({ branchId: 1, invoiceNo: 1 }, { unique: true });
invoiceSchema.index({ branchId: 1, studentId: 1, status: 1 });
invoiceSchema.index({ branchId: 1, dueDate: 1, status: 1 });

const paymentSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    receiptNo: { type: String, required: true },
    invoiceId: { ...ref("Invoice"), required: true, index: true },
    studentId: { ...ref("Student"), required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["cash", "bank_transfer", "online", "card", "cheque"],
      default: "cash",
    },
    reference: { type: String, default: "" },
    paidAt: { type: Date, default: Date.now, index: true },
    recordedBy: { ...ref("User"), default: null },
    notes: { type: String, default: "" },
  },
  baseOptions
);
paymentSchema.index({ branchId: 1, receiptNo: 1 }, { unique: true });
paymentSchema.index({ branchId: 1, paidAt: -1 });

const expenseSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    voucherNo: { type: String, required: true },
    category: { type: String, required: true, index: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, index: true },
    paidTo: { type: String, default: "" },
    method: { type: String, enum: ["cash", "bank_transfer", "cheque", "online"], default: "cash" },
    recordedBy: { ...ref("User"), default: null },
    attachment: { type: String, default: "" },
  },
  baseOptions
);
expenseSchema.index({ branchId: 1, date: -1 });

const counterSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    key: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  baseOptions
);
counterSchema.index({ branchId: 1, key: 1 }, { unique: true });

export const FeeStructure = getModel("FeeStructure", feeStructureSchema);
export const Invoice = getModel("Invoice", invoiceSchema);
export const Payment = getModel("Payment", paymentSchema);
export const Expense = getModel("Expense", expenseSchema);
export const Counter = getModel("Counter", counterSchema);
