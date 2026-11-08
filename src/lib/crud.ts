import "server-only";
import type { Model } from "mongoose";
import type { ZodType } from "zod";
import { NextResponse } from "next/server";
import { requireApi, ok, handleError, pagination, searchRegex, buildPaginationMeta, branchScope } from "./api";
import { recordAudit } from "./audit";
import type { SessionUser } from "./auth";

export type CrudConfig = {
  model: Model<any>;
  permission: string;
  entity: string;
  searchFields?: string[];
  sort?: Record<string, 1 | -1>;
  populate?: { path: string; select?: string }[];
  schema?: ZodType;
  updateSchema?: ZodType;
  branchScoped?: boolean;
  filter?: (params: URLSearchParams) => Record<string, unknown>;
  beforeCreate?: (data: Record<string, any>, user: SessionUser) => Promise<Record<string, any>> | Record<string, any>;
  beforeUpdate?: (data: Record<string, any>, user: SessionUser) => Promise<Record<string, any>> | Record<string, any>;
  beforeDelete?: (doc: any, user: SessionUser) => Promise<string | null> | string | null;
  afterChange?: (doc: any, user: SessionUser, action: "create" | "update" | "delete") => Promise<void> | void;
  labelField?: string;
};

function listFilter(config: CrudConfig, params: URLSearchParams, user: SessionUser) {
  const filter: Record<string, unknown> = config.branchScoped === false ? { organizationId: user.organizationId } : branchScope(user);
  const q = searchRegex(params.get("q"));
  if (q && config.searchFields?.length) {
    filter.$or = config.searchFields.map((field) => ({ [field]: q }));
  }
  if (config.filter) Object.assign(filter, config.filter(params));
  return filter;
}

export function crudCollection(config: CrudConfig) {
  const GET = async (req: Request) => {
    try {
      const auth = await requireApi(`${config.permission}.view`);
      if (auth.error) return auth.error;
      const params = new URL(req.url).searchParams;
      const { page, limit, skip } = pagination(params);
      const filter = listFilter(config, params, auth.user);
      let query = config.model.find(filter).sort(config.sort || { createdAt: -1 }).skip(skip).limit(limit);
      for (const p of config.populate || []) query = query.populate(p.path, p.select);
      const [data, total] = await Promise.all([query.lean(), config.model.countDocuments(filter)]);
      return NextResponse.json({ data, meta: buildPaginationMeta(total, page, limit) });
    } catch (err) {
      return handleError(err);
    }
  };

  const POST = async (req: Request) => {
    try {
      const auth = await requireApi(`${config.permission}.create`);
      if (auth.error) return auth.error;
      let body = await req.json();
      if (config.schema) body = config.schema.parse(body);
      if (config.beforeCreate) body = await config.beforeCreate(body, auth.user);
      const branchId =
        config.branchScoped === false ? null : auth.user.activeBranchId || auth.user.branchId || body.branchId || null;
      if (config.branchScoped !== false && !branchId && config.model.schema.path("branchId")?.isRequired) {
        return NextResponse.json({ error: "Select an active branch before creating this record." }, { status: 400 });
      }
      const doc = await config.model.create({
        ...body,
        organizationId: auth.user.organizationId,
        ...(config.branchScoped === false ? {} : { branchId }),
      });
      await recordAudit({
        organizationId: auth.user.organizationId,
        branchId,
        userId: auth.user.id,
        userName: auth.user.name,
        action: "create",
        entity: config.entity,
        entityId: String(doc._id),
        description: `Created ${config.entity}${config.labelField ? `: ${doc[config.labelField]}` : ""}`,
      });
      await config.afterChange?.(doc, auth.user, "create");
      return NextResponse.json({ ok: true, data: doc, message: `${config.entity} created` }, { status: 201 });
    } catch (err) {
      return handleError(err);
    }
  };

  return { GET, POST };
}

export function crudItem(config: CrudConfig) {
  const itemFilter = (id: string, user: SessionUser) => {
    const filter: Record<string, unknown> = { _id: id, organizationId: user.organizationId };
    if (config.branchScoped !== false && user.activeBranchId) filter.branchId = user.activeBranchId;
    return filter;
  };

  const GET = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    try {
      const auth = await requireApi(`${config.permission}.view`);
      if (auth.error) return auth.error;
      const { id } = await ctx.params;
      let query = config.model.findOne(itemFilter(id, auth.user));
      for (const p of config.populate || []) query = query.populate(p.path, p.select);
      const doc = await query.lean();
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ data: doc });
    } catch (err) {
      return handleError(err);
    }
  };

  const PATCH = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    try {
      const auth = await requireApi(`${config.permission}.update`);
      if (auth.error) return auth.error;
      const { id } = await ctx.params;
      let body = await req.json();
      if (config.updateSchema) body = config.updateSchema.parse(body);
      else if (config.schema) body = (config.schema as any).partial().parse(body);
      if (config.beforeUpdate) body = await config.beforeUpdate(body, auth.user);
      const doc = await config.model.findOneAndUpdate(itemFilter(id, auth.user), { $set: body }, { new: true, runValidators: true });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await recordAudit({
        organizationId: auth.user.organizationId,
        branchId: doc.branchId ? String(doc.branchId) : null,
        userId: auth.user.id,
        userName: auth.user.name,
        action: "update",
        entity: config.entity,
        entityId: String(doc._id),
        description: `Updated ${config.entity}${config.labelField ? `: ${doc[config.labelField]}` : ""}`,
      });
      await config.afterChange?.(doc, auth.user, "update");
      return NextResponse.json({ ok: true, data: doc, message: `${config.entity} updated` });
    } catch (err) {
      return handleError(err);
    }
  };

  const DELETE = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    try {
      const auth = await requireApi(`${config.permission}.delete`);
      if (auth.error) return auth.error;
      const { id } = await ctx.params;
      const doc = await config.model.findOne(itemFilter(id, auth.user));
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (config.beforeDelete) {
        const message = await config.beforeDelete(doc, auth.user);
        if (message) return NextResponse.json({ error: message }, { status: 409 });
      }
      await doc.deleteOne();
      await recordAudit({
        organizationId: auth.user.organizationId,
        branchId: doc.branchId ? String(doc.branchId) : null,
        userId: auth.user.id,
        userName: auth.user.name,
        action: "delete",
        entity: config.entity,
        entityId: String(doc._id),
        description: `Deleted ${config.entity}${config.labelField ? `: ${doc[config.labelField]}` : ""}`,
      });
      await config.afterChange?.(doc, auth.user, "delete");
      return NextResponse.json({ ok: true, message: `${config.entity} deleted` });
    } catch (err) {
      return handleError(err);
    }
  };

  return { GET, PATCH, DELETE };
}

export function buildCrud(config: CrudConfig) {
  return { ...crudCollection(config), ...crudItem(config) };
}
