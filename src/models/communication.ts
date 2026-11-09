import { Schema } from "@/lib/pgdb";
import { baseOptions, getModel, ref } from "./helpers";

const announcementSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    audience: {
      type: String,
      enum: ["all", "students", "parents", "teachers", "staff", "class"],
      default: "all",
      index: true,
    },
    classIds: [{ ...ref("SchoolClass") }],
    priority: { type: String, enum: ["normal", "high", "urgent"], default: "normal" },
    status: { type: String, enum: ["draft", "scheduled", "published"], default: "published", index: true },
    publishedAt: { type: Date, default: Date.now },
    scheduledAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    attachments: [{ title: String, url: String, _id: false }],
    channels: { type: [String], default: ["in_app"] },
    createdBy: { ...ref("User"), default: null },
  },
  baseOptions
);
announcementSchema.index({ branchId: 1, status: 1, publishedAt: -1 });

const notificationSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), default: null, index: true },
    userId: { ...ref("User"), required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    type: { type: String, default: "info" },
    link: { type: String, default: "" },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  baseOptions
);
notificationSchema.index({ userId: 1, createdAt: -1 });

const eventSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { type: String, default: "" },
    type: { type: String, default: "event" },
    createdBy: { ...ref("User"), default: null },
  },
  baseOptions
);
eventSchema.index({ branchId: 1, startDate: 1 });

const messageSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    senderId: { ...ref("User"), required: true, index: true },
    recipientId: { ...ref("User"), required: true, index: true },
    subject: { type: String, default: "" },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  baseOptions
);
messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });

export const Announcement = getModel("Announcement", announcementSchema);
export const Notification = getModel("Notification", notificationSchema);
export const Event = getModel("Event", eventSchema);
export const Message = getModel("Message", messageSchema);
