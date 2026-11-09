import { Schema } from "@/lib/pgdb";
import { baseOptions, getModel, ref } from "./helpers";

const academicYearSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false, index: true },
    terms: [
      {
        name: { type: String, required: true },
        startDate: Date,
        endDate: Date,
      },
    ],
  },
  baseOptions
);
academicYearSchema.index({ organizationId: 1, name: 1 }, { unique: true });

const schoolClassSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    name: { type: String, required: true },
    level: { type: Number, default: 0 },
    stream: { type: String, default: "" },
    capacity: { type: Number, default: 40 },
    isActive: { type: Boolean, default: true },
  },
  baseOptions
);
schoolClassSchema.index({ branchId: 1, name: 1 }, { unique: true });

const sectionSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    classId: { ...ref("SchoolClass"), required: true, index: true },
    name: { type: String, required: true },
    capacity: { type: Number, default: 40 },
    classTeacherId: { ...ref("User"), default: null },
    room: { type: String, default: "" },
  },
  baseOptions
);
sectionSchema.index({ classId: 1, name: 1 }, { unique: true });

const subjectSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true },
    classIds: [{ ...ref("SchoolClass") }],
    isElective: { type: Boolean, default: false },
    maxMarks: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
  },
  baseOptions
);
subjectSchema.index({ branchId: 1, code: 1 }, { unique: true });

const teacherAssignmentSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    academicYearId: { ...ref("AcademicYear"), default: null },
    teacherId: { ...ref("User"), required: true, index: true },
    employeeId: { ...ref("Employee"), default: null },
    subjectId: { ...ref("Subject"), required: true, index: true },
    classId: { ...ref("SchoolClass"), required: true, index: true },
    sectionId: { ...ref("Section"), required: true, index: true },
  },
  baseOptions
);
teacherAssignmentSchema.index(
  { branchId: 1, teacherId: 1, subjectId: 1, classId: 1, sectionId: 1 },
  { unique: true }
);

const timetableSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    academicYearId: { ...ref("AcademicYear"), default: null },
    classId: { ...ref("SchoolClass"), required: true, index: true },
    sectionId: { ...ref("Section"), required: true, index: true },
    dayOfWeek: { type: String, required: true },
    periods: [
      {
        period: { type: Number, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        subjectId: { ...ref("Subject"), default: null },
        teacherId: { ...ref("User"), default: null },
        room: { type: String, default: "" },
      },
    ],
  },
  baseOptions
);
timetableSchema.index({ branchId: 1, classId: 1, sectionId: 1, dayOfWeek: 1 }, { unique: true });

const homeworkSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    academicYearId: { ...ref("AcademicYear"), default: null },
    classId: { ...ref("SchoolClass"), required: true, index: true },
    sectionId: { ...ref("Section"), required: true, index: true },
    subjectId: { ...ref("Subject"), required: true, index: true },
    teacherId: { ...ref("User"), default: null },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, required: true },
    attachments: [{ title: String, url: String, _id: false }],
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  baseOptions
);
homeworkSchema.index({ branchId: 1, classId: 1, sectionId: 1, dueDate: -1 });

const lessonPlanSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    classId: { ...ref("SchoolClass"), required: true },
    sectionId: { ...ref("Section"), default: null },
    subjectId: { ...ref("Subject"), required: true },
    teacherId: { ...ref("User"), default: null },
    title: { type: String, required: true },
    objectives: { type: String, default: "" },
    content: { type: String, default: "" },
    week: { type: String, default: "" },
    status: { type: String, enum: ["draft", "approved"], default: "draft" },
  },
  baseOptions
);

export const AcademicYear = getModel("AcademicYear", academicYearSchema);
export const SchoolClass = getModel("SchoolClass", schoolClassSchema);
export const Section = getModel("Section", sectionSchema);
export const Subject = getModel("Subject", subjectSchema);
export const TeacherAssignment = getModel("TeacherAssignment", teacherAssignmentSchema);
export const Timetable = getModel("Timetable", timetableSchema);
export const Homework = getModel("Homework", homeworkSchema);
export const LessonPlan = getModel("LessonPlan", lessonPlanSchema);
