import { Schema } from "@/lib/pgdb";
import { baseOptions, getModel, ref } from "./helpers";
import { ROLES } from "../lib/constants";

const userSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    phone: { type: String, default: "" },
    avatar: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active", index: true },
    extraPermissions: { type: [String], default: [] },
    deniedPermissions: { type: [String], default: [] },
    studentId: { ...ref("Student"), default: null },
    employeeId: { ...ref("Employee"), default: null },
    children: [{ ...ref("Student") }],
    lastLoginAt: { type: Date, default: null },
    resetToken: { type: String, default: null, select: false },
    resetTokenExpires: { type: Date, default: null, select: false },
    mustChangePassword: { type: Boolean, default: false },
  },
  baseOptions
);
userSchema.index({ organizationId: 1, branchId: 1, role: 1 });
userSchema.index({ name: "text", email: "text" });

export const User = getModel("User", userSchema);
