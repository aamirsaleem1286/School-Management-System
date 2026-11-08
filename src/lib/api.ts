import "server-only";
import { NextResponse } from "next/server";
import { dbConnect } from "./db";
import { getSessionUser, type SessionUser } from "./auth";
import { can } from "./auth";

export type ApiContext = { user: SessionUser; error?: never };
export type ApiError = { user?: never; error: NextResponse };

export async function requireApi(permission?: string): Promise<ApiContext | ApiError> {
  await dbConnect();
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (permission && !can(user, permission)) {
    return { error: NextResponse.json({ error: "Forbidden: missing permission " + permission }, { status: 403 }) };
  }
  return { user };
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleError(err: unknown) {
  console.error("[api]", err);
  const message = err instanceof Error ? err.message : "Unexpected error";
  if (message === "UNAUTHORIZED") return fail("Unauthorized", 401);
  if (message === "FORBIDDEN") return fail("Forbidden", 403);
  if (err && typeof err === "object" && (err as { name?: string }).name === "ZodError") {
    const issues = (err as { issues?: { path: (string | number)[]; message: string }[] }).issues || [];
    const first = issues[0];
    const detail = first ? `${first.path.join(".") || "field"}: ${first.message}` : "Invalid input";
    return fail(detail, 422, { issues });
  }
  if (err && typeof err === "object" && (err as { name?: string }).name === "CastError") {
    return fail("One of the selected values is invalid. Please review the form.", 400);
  }
  if (message.includes("E11000") || message.includes("duplicate key")) {
    return fail("A record with these unique details already exists.", 409);
  }
  if (err instanceof Error && err.name === "ValidationError") {
    return fail(message, 422);
  }
  return fail(message, 500);
}

export function branchScope(user: SessionUser): Record<string, unknown> {
  const filter: Record<string, unknown> = { organizationId: user.organizationId };
  if (user.activeBranchId) filter.branchId = user.activeBranchId;
  return filter;
}

export function pagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 20)));
  return { page, limit, skip: (page - 1) * limit };
}

export function searchRegex(value: string | null) {
  if (!value) return null;
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}
