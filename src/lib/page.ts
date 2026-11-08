import "server-only";
import { redirect } from "next/navigation";
import { can, getSessionUser, type SessionUser } from "./auth";

export async function requirePage(permission: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user, permission)) redirect("/dashboard?denied=1");
  return user;
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function listParams(params: Record<string, string | string[] | undefined>, defaultLimit = 12) {
  const page = Math.max(1, Number(readParam(params, "page") || 1));
  const limit = Math.min(100, Math.max(1, Number(readParam(params, "limit") || defaultLimit)));
  return { page, limit, skip: (page - 1) * limit, q: readParam(params, "q") || "" };
}

export function pageCount(total: number, limit: number) {
  return Math.max(1, Math.ceil(total / limit));
}
