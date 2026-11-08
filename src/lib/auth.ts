import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { assertAuthSecret, env } from "./env";
import { dbConnect } from "./db";
import { User } from "@/models";
import { resolvePermissions } from "./permissions";
import type { Role } from "./constants";

export const SESSION_COOKIE = "sms_session";
export const BRANCH_COOKIE = "sms_branch";

export type SessionPayload = {
  userId: string;
  role: Role;
  organizationId: string;
  branchId: string | null;
  name: string;
  email: string;
};

function secretKey() {
  return new TextEncoder().encode(assertAuthSecret());
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.AUTH_SESSION_TTL}s`)
    .setSubject(payload.userId)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.userId) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
  branchId: string | null;
  activeBranchId: string | null;
  avatar?: string;
  phone?: string;
  permissions: string[];
  organization?: { id: string; name: string; logo?: string; currency: string; locale: string };
  branch?: { id: string; name: string; code: string } | null;
  children?: string[];
  studentId?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  await dbConnect();
  const user = await User.findById(payload.userId).lean();
  if (!user || user.status !== "active") return null;

  const store = await cookies();
  const branchCookie = store.get(BRANCH_COOKIE)?.value;
  let activeBranchId = user.branchId ? String(user.branchId) : null;
  if (payload.role === "super_admin" && branchCookie) {
    activeBranchId = branchCookie;
  }

  const permissions = resolvePermissions(
    user.role as Role,
    (user.extraPermissions as string[]) || [],
    (user.deniedPermissions as string[]) || []
  );

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    organizationId: String(user.organizationId),
    branchId: user.branchId ? String(user.branchId) : null,
    activeBranchId,
    avatar: user.avatar || undefined,
    phone: user.phone || undefined,
    permissions,
    children: (user.children || []).map(String),
    studentId: user.studentId ? String(user.studentId) : null,
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function can(user: SessionUser, permission: string) {
  return user.permissions.includes("*") || user.permissions.includes(permission);
}

export function assertPermission(user: SessionUser, permission: string) {
  if (!can(user, permission)) {
    throw new Error("FORBIDDEN");
  }
}

export function scopeFilter(user: SessionUser): Record<string, unknown> {
  const filter: Record<string, unknown> = { organizationId: user.organizationId };
  if (user.activeBranchId) filter.branchId = user.activeBranchId;
  return filter;
}
