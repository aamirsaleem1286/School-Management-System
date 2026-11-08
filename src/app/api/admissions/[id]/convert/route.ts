import { NextResponse } from "next/server";
import { Admission, Student } from "@/models";
import { fail, handleError, requireApi } from "@/lib/api";
import { nextSequence } from "@/lib/numbering";
import { recordAudit } from "@/lib/audit";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApi("admissions.approve");
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    const admission = await Admission.findOne({ _id: id, organizationId: auth.user.organizationId });
    if (!admission) return fail("Application not found", 404);
    if (admission.studentId) return fail("This application has already been converted to a student", 409);
    const branchId = admission.branchId ? String(admission.branchId) : auth.user.activeBranchId || auth.user.branchId;
    if (!branchId) return fail("No branch is associated with this application", 400);
    const admissionNo = await nextSequence(auth.user.organizationId, branchId, "admission", "STD");
    const student = await Student.create({
      organizationId: auth.user.organizationId,
      branchId,
      admissionNo,
      academicYearId: admission.academicYearId || null,
      firstName: admission.firstName,
      lastName: admission.lastName,
      gender: admission.gender,
      dob: admission.dob,
      classId: admission.classAppliedId || null,
      admissionDate: new Date(),
      status: "active",
      address: admission.address || "",
      previousSchool: admission.previousSchool || "",
      guardian: {
        fatherName: admission.relation === "Father" ? admission.guardianName : "",
        guardianName: admission.guardianName,
        relation: admission.relation || "Father",
        phone: admission.phone,
        email: admission.email || "",
        address: admission.address || "",
      },
    });
    admission.status = "approved";
    admission.studentId = student._id as any;
    admission.reviewedBy = auth.user.id as any;
    admission.reviewedAt = new Date();
    await admission.save();
    await recordAudit({
      organizationId: auth.user.organizationId,
      branchId,
      userId: auth.user.id,
      userName: auth.user.name,
      action: "approve",
      entity: "Admission",
      entityId: String(admission._id),
      description: `Approved application ${admission.applicationNo} and enrolled student ${admissionNo}`,
    });
    return NextResponse.json({ ok: true, message: `Student enrolled as ${admissionNo}`, data: { studentId: student._id } });
  } catch (err) {
    return handleError(err);
  }
}
