import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Organization, Branch } from "@/models";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const [org, branches] = await Promise.all([
    Organization.findById(user.organizationId).lean(),
    Branch.find({ organizationId: user.organizationId, isActive: true }).select("name code isMain").lean(),
  ]);
  return NextResponse.json({
    user,
    organization: org
      ? {
          id: String(org._id),
          name: org.name,
          logo: org.logo || "",
          currency: org.settings?.currency || "PKR",
          locale: org.settings?.locale || "en-PK",
          academicYear: org.settings?.academicYear || "",
        }
      : null,
    branches: branches.map((b) => ({ id: String(b._id), name: b.name, code: b.code, isMain: b.isMain })),
  });
}
