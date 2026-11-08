import { Schema } from "mongoose";
import { baseOptions, getModel, ref } from "./helpers";

const libraryBookSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    title: { type: String, required: true },
    author: { type: String, default: "" },
    isbn: { type: String, default: "" },
    category: { type: String, default: "General", index: true },
    copiesTotal: { type: Number, default: 1, min: 0 },
    copiesAvailable: { type: Number, default: 1, min: 0 },
    shelf: { type: String, default: "" },
    price: { type: Number, default: 0 },
    publishedYear: { type: Number, default: null },
  },
  baseOptions
);
libraryBookSchema.index({ branchId: 1, title: "text", author: "text", isbn: "text" });

const libraryTransactionSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    bookId: { ...ref("LibraryBook"), required: true, index: true },
    borrowerType: { type: String, enum: ["student", "staff"], default: "student" },
    studentId: { ...ref("Student"), default: null, index: true },
    employeeId: { ...ref("Employee"), default: null },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date, default: null },
    fine: { type: Number, default: 0 },
    status: { type: String, enum: ["issued", "returned", "overdue"], default: "issued", index: true },
    issuedBy: { ...ref("User"), default: null },
  },
  baseOptions
);
libraryTransactionSchema.index({ branchId: 1, status: 1, dueDate: 1 });

const transportRouteSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    name: { type: String, required: true },
    stops: [{ name: String, time: String, _id: false }],
    fee: { type: Number, default: 0 },
    vehicleId: { ...ref("Vehicle"), default: null },
    driverName: { type: String, default: "" },
    driverPhone: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  baseOptions
);

const vehicleSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    regNo: { type: String, required: true },
    model: { type: String, default: "" },
    capacity: { type: Number, default: 0 },
    driverName: { type: String, default: "" },
    driverPhone: { type: String, default: "" },
    driverLicense: { type: String, default: "" },
    insuranceExpiry: { type: Date, default: null },
    status: { type: String, enum: ["active", "maintenance", "retired"], default: "active" },
  },
  baseOptions
);
vehicleSchema.index({ branchId: 1, regNo: 1 }, { unique: true });

const hostelSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["boys", "girls", "mixed"], default: "boys" },
    wardenName: { type: String, default: "" },
    wardenPhone: { type: String, default: "" },
    fee: { type: Number, default: 0 },
    rooms: [
      {
        roomNo: { type: String, required: true },
        capacity: { type: Number, default: 4 },
        occupied: { type: Number, default: 0 },
      },
    ],
    messEnabled: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  baseOptions
);

const inventoryItemSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, default: "General", index: true },
    sku: { type: String, default: "" },
    quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "pcs" },
    unitPrice: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    supplier: { type: String, default: "" },
    location: { type: String, default: "" },
  },
  baseOptions
);
inventoryItemSchema.index({ branchId: 1, name: "text", sku: "text" });

const visitorSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, default: "" },
    purpose: { type: String, required: true },
    meetingWith: { type: String, default: "" },
    idProof: { type: String, default: "" },
    badgeNo: { type: String, default: "" },
    checkIn: { type: Date, default: Date.now, index: true },
    checkOut: { type: Date, default: null },
    status: { type: String, enum: ["checked_in", "checked_out"], default: "checked_in" },
  },
  baseOptions
);

const healthRecordSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    studentId: { ...ref("Student"), required: true, index: true },
    bloodGroup: { type: String, default: "" },
    height: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    allergies: { type: String, default: "" },
    conditions: { type: String, default: "" },
    notes: { type: String, default: "" },
    vaccinations: [{ name: String, date: Date, _id: false }],
    visitDate: { type: Date, default: Date.now },
  },
  baseOptions
);

export const LibraryBook = getModel("LibraryBook", libraryBookSchema);
export const LibraryTransaction = getModel("LibraryTransaction", libraryTransactionSchema);
export const TransportRoute = getModel("TransportRoute", transportRouteSchema);
export const Vehicle = getModel("Vehicle", vehicleSchema);
export const Hostel = getModel("Hostel", hostelSchema);
export const InventoryItem = getModel("InventoryItem", inventoryItemSchema);
export const Visitor = getModel("Visitor", visitorSchema);
export const HealthRecord = getModel("HealthRecord", healthRecordSchema);
