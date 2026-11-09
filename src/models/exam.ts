import { Schema } from "@/lib/pgdb";
import { baseOptions, getModel, ref } from "./helpers";

const examSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    academicYearId: { ...ref("AcademicYear"), default: null },
    name: { type: String, required: true },
    type: { type: String, enum: ["quiz", "monthly", "midterm", "final", "practical"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    classIds: [{ ...ref("SchoolClass") }],
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "published"],
      default: "scheduled",
      index: true,
    },
    gradingScale: {
      type: [
        {
          grade: String,
          min: Number,
          max: Number,
          gpa: Number,
          remarks: String,
          _id: false,
        },
      ],
      default: [],
    },
    datesheet: [
      {
        classId: { ...ref("SchoolClass") },
        subjectId: { ...ref("Subject") },
        date: Date,
        startTime: String,
        endTime: String,
        room: String,
      },
    ],
    publishedAt: { type: Date, default: null },
    createdBy: { ...ref("User"), default: null },
  },
  baseOptions
);
examSchema.index({ branchId: 1, academicYearId: 1, status: 1 });

const markSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    examId: { ...ref("Exam"), required: true, index: true },
    studentId: { ...ref("Student"), required: true, index: true },
    classId: { ...ref("SchoolClass"), default: null, index: true },
    sectionId: { ...ref("Section"), default: null },
    subjectId: { ...ref("Subject"), required: true, index: true },
    obtainedMarks: { type: Number, required: true, min: 0 },
    totalMarks: { type: Number, required: true, min: 1 },
    grade: { type: String, default: "" },
    gpa: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    status: { type: String, enum: ["draft", "submitted", "approved"], default: "draft", index: true },
    enteredBy: { ...ref("User"), default: null },
    approvedBy: { ...ref("User"), default: null },
  },
  baseOptions
);
markSchema.index({ examId: 1, studentId: 1, subjectId: 1 }, { unique: true });

const reportCardSchema = new Schema(
  {
    organizationId: { ...ref("Organization"), required: true, index: true },
    branchId: { ...ref("Branch"), required: true, index: true },
    examId: { ...ref("Exam"), required: true, index: true },
    studentId: { ...ref("Student"), required: true, index: true },
    classId: { ...ref("SchoolClass"), default: null },
    sectionId: { ...ref("Section"), default: null },
    subjects: [
      {
        subjectId: { ...ref("Subject") },
        name: String,
        obtained: Number,
        total: Number,
        grade: String,
        gpa: Number,
        _id: false,
      },
    ],
    totalObtained: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    gpa: { type: Number, default: 0 },
    grade: { type: String, default: "" },
    position: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
  },
  baseOptions
);
reportCardSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export const Exam = getModel("Exam", examSchema);
export const Mark = getModel("Mark", markSchema);
export const ReportCard = getModel("ReportCard", reportCardSchema);
