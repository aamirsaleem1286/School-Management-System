import { NextResponse } from "next/server";
import { Attendance } from "@/models";
import { branchScope, fail, handleError, requireApi } from "@/lib/api";
import { attendanceBulkSchema } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";
import { endOfDay, startOfDay } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const auth = await requireApi("attendance.view");
    if (auth.error) return auth.error;
    const params = new URL(req.url).searchParams;
    const filter: Record<string, unknown> = branchScope(auth.user);
    const date = params.get("date");
    if (date) {
      const d = new Date(date);
      filter.date = { $gte: startOfDay(d), $lte: endOfDay(d) };
    }
    for (const key of ["personType", "classId", "sectionId", "status"]) {
      const v = params.get(key);
      if (v) filter[key] = v;
    }
    const data = await Attendance.find(filter)
      .populate("studentId", "firstName lastName admissionNo rollNo")
      .populate("employeeId", "firstName lastName employeeNo")
      .sort({ date: -1 })
      .limit(500)
      .lean();
    return NextResponse.json({ data });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApi("attendance.create");
    if (auth.error) return auth.error;
    const input = attendanceBulkSchema.parse(await req.json());
    const branchId = auth.user.activeBranchId || auth.user.branchId;
    if (!branchId) return fail("Select an active branch first", 400);
    const date = startOfDay(input.date);
    const ops = input.records.map((record) => ({
      updateOne: {
        filter: {
          organizationId: auth.user.organizationId,
          branchId,
          personType: input.personType,
          personId: record.personId,
          date,
        },
        update: {
          $set: {
            status: record.status,
            remarks: record.remarks || "",
            markedBy: auth.user.id,
            source: input.source || "manual",
            classId: input.classId || null,
            sectionId: input.sectionId || null,
            studentId: input.personType === "student" ? record.personId : null,
            employeeId: input.personType === "staff" ? record.personId : null,
          },
          $setOnInsert: { organizationId: auth.user.organizationId, branchId, personType: input.personType, personId: record.personId, date },
        },
        upsert: true,
      },
    }));
    if (ops.length) await Attendance.bulkWrite(ops);
    await recordAudit({
      organizationId: auth.user.organizationId,
      branchId,
      userId: auth.user.id,
      userName: auth.user.name,
      action: "attendance",
      entity: "Attendance",
      description: `Marked ${ops.length} ${input.personType} attendance records for ${date.toDateString()}`,
    });
    return NextResponse.json({ ok: true, message: `Attendance saved for ${ops.length} records` });
  } catch (err) {
    return handleError(err);
  }
}
