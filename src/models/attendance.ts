import { Schema } from "mongoose";
import { baseOptions, getModel, ref } from "./helpers";

const attendanceSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    academicYearId: { ...ref("AcademicYear"), default: null },
    date: { type: Date, required: true, index: true },
    personType: { type: String, enum: ["student", "staff"], required: true, index: true },
    personId: { type: Schema.Types.ObjectId, required: true, index: true },
    studentId: { ...ref("Student"), default: null, index: true },
    employeeId: { ...ref("Employee"), default: null, index: true },
    classId: { ...ref("SchoolClass"), default: null, index: true },
    sectionId: { ...ref("Section"), default: null },
    status: { type: String, enum: ["present", "absent", "late", "leave"], required: true },
    remarks: { type: String, default: "" },
    markedBy: { ...ref("User"), default: null },
    source: { type: String, enum: ["manual", "qr", "barcode", "biometric", "rfid"], default: "manual" },
  },
  baseOptions
);
attendanceSchema.index({ branchId: 1, personType: 1, personId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ branchId: 1, date: 1, classId: 1, sectionId: 1, status: 1 });

const leaveRequestSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    applicantType: { type: String, enum: ["student", "staff"], required: true },
    personId: { type: Schema.Types.ObjectId, default: null },
    studentId: { ...ref("Student"), default: null, index: true },
    employeeId: { ...ref("Employee"), default: null, index: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    type: { type: String, default: "general" },
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { ...ref("User"), default: null },
    reviewedAt: { type: Date, default: null },
    remarks: { type: String, default: "" },
  },
  baseOptions
);
leaveRequestSchema.index({ branchId: 1, status: 1, createdAt: -1 });

export const Attendance = getModel("Attendance", attendanceSchema);
export const LeaveRequest = getModel("LeaveRequest", leaveRequestSchema);
