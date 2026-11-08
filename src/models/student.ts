import { Schema } from "mongoose";
import { baseOptions, getModel, ref } from "./helpers";

const guardianInfoSchema = new Schema(
  {
    fatherName: { type: String, default: "" },
    motherName: { type: String, default: "" },
    guardianName: { type: String, default: "" },
    relation: { type: String, default: "Father" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    occupation: { type: String, default: "" },
    cnic: { type: String, default: "" },
    monthlyIncome: { type: Number, default: 0 },
    address: { type: String, default: "" },
  },
  { _id: false }
);

const documentSchema = new Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: "document" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const studentSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    admissionNo: { type: String, required: true, trim: true },
    rollNo: { type: String, default: "" },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dob: { type: Date, required: true },
    bloodGroup: { type: String, default: "" },
    religion: { type: String, default: "" },
    nationality: { type: String, default: "Pakistani" },
    classId: { ...ref("SchoolClass"), default: null, index: true },
    sectionId: { ...ref("Section"), default: null, index: true },
    academicYearId: { ...ref("AcademicYear"), default: null, index: true },
    status: {
      type: String,
      enum: ["active", "inactive", "graduated", "transferred", "left"],
      default: "active",
      index: true,
    },
    admissionDate: { type: Date, default: Date.now },
    photo: { type: String, default: "" },
    documents: { type: [documentSchema], default: [] },
    guardian: { type: guardianInfoSchema, default: () => ({}) },
    emergencyContact: {
      name: { type: String, default: "" },
      relation: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    medical: {
      allergies: { type: String, default: "" },
      conditions: { type: String, default: "" },
      notes: { type: String, default: "" },
      vaccinations: [{ name: String, date: Date, _id: false }],
    },
    previousSchool: { type: String, default: "" },
    transportRouteId: { ...ref("TransportRoute"), default: null },
    hostelRoomId: { type: String, default: null },
    userId: { ...ref("User"), default: null },
    guardianUserIds: [{ ...ref("User") }],
    siblingIds: [{ ...ref("Student") }],
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  baseOptions
);

studentSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

studentSchema.index({ branchId: 1, admissionNo: 1 }, { unique: true });
studentSchema.index({ branchId: 1, classId: 1, sectionId: 1, status: 1 });
studentSchema.index({ firstName: "text", lastName: "text", admissionNo: "text", "guardian.phone": "text" });

const guardianSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    name: { type: String, required: true },
    relation: { type: String, default: "Father" },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    cnic: { type: String, default: "" },
    occupation: { type: String, default: "" },
    address: { type: String, default: "" },
    userId: { ...ref("User"), default: null },
    studentIds: [{ ...ref("Student") }],
  },
  baseOptions
);
guardianSchema.index({ branchId: 1, phone: 1 });

const admissionSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    applicationNo: { type: String, required: true },
    academicYearId: { ...ref("AcademicYear"), default: null },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dob: { type: Date, required: true },
    classAppliedId: { ...ref("SchoolClass"), default: null },
    guardianName: { type: String, required: true },
    relation: { type: String, default: "Father" },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    previousSchool: { type: String, default: "" },
    previousPercentage: { type: Number, default: 0 },
    documents: { type: [documentSchema], default: [] },
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "waitlisted"],
      default: "pending",
      index: true,
    },
    notes: { type: String, default: "" },
    source: { type: String, default: "online" },
    reviewedBy: { ...ref("User"), default: null },
    reviewedAt: { type: Date, default: null },
    studentId: { ...ref("Student"), default: null },
  },
  baseOptions
);
admissionSchema.index({ branchId: 1, applicationNo: 1 }, { unique: true });
admissionSchema.index({ branchId: 1, status: 1, createdAt: -1 });

export const Student = getModel("Student", studentSchema);
export const Guardian = getModel("Guardian", guardianSchema);
export const Admission = getModel("Admission", admissionSchema);
