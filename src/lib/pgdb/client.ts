import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

type PgCache = {
  sql: Sql | null;
  ready: Promise<void> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __pgdbCache: PgCache | undefined;
}

const cache: PgCache = globalThis.__pgdbCache ?? (globalThis.__pgdbCache = { sql: null, ready: null });

const TABLE = "app_documents";

type BatchState = {
  collections: Map<string, Map<string, Record<string, any>>>;
  deleted: Map<string, Set<string>>;
};

let batch: BatchState | null = null;

export function beginBatch(): void {
  batch = { collections: new Map(), deleted: new Map() };
}

export async function flushBatch(): Promise<void> {
  if (!batch) return;
  const state = batch;
  batch = null;
  for (const [collection, ids] of state.deleted) {
    if (!ids.size) continue;
    await deleteDocuments(collection, [...ids]);
  }
  for (const [collection, docs] of state.collections) {
    await writeDocuments(collection, [...docs.values()]);
  }
}

export function inBatch(): boolean {
  return batch !== null;
}

export function databaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    ""
  );
}

export function hasDatabaseUrl(): boolean {
  return Boolean(databaseUrl());
}

export function getSql(): Sql {
  if (!cache.sql) {
    const url = databaseUrl();
    if (!url) {
      throw new Error(
        "DATABASE_URL is required. Set it to your Neon/Postgres connection string (see .env.example)."
      );
    }
    cache.sql = postgres(url, {
      prepare: false,
      max: 5,
      idle_timeout: 0,
      max_lifetime: null,
      connect_timeout: 15,
      keep_alive: 60,
      onnotice: () => undefined,
    });
  }
  return cache.sql;
}

function isRetryableConnectionError(err: any): boolean {
  const code = String(err?.code || "");
  if (
    ["ECONNRESET", "ECONNREFUSED", "EPIPE", "ETIMEDOUT", "CONNECTION_CLOSED", "CONNECTION_ENDED", "57P01", "57P02", "57P03", "08000", "08003", "08006"].includes(
      code
    )
  ) {
    return true;
  }
  return /connection (?:terminated|closed|reset)|socket hang up|server closed the connection/i.test(
    String(err?.message || "")
  );
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableConnectionError(err) || attempt === attempts - 1) throw err;
      await closeConnection();
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function ensureSchema(): Promise<void> {
  if (!cache.ready) {
    cache.ready = withRetry(async () => {
      const sql = getSql();
      await sql.unsafe(`
        create table if not exists ${TABLE} (
          collection text not null,
          id text not null,
          doc jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          primary key (collection, id)
        );
      `);
      await sql.unsafe(`create index if not exists ${TABLE}_collection_idx on ${TABLE} (collection);`);
      await sql.unsafe(
        `create index if not exists ${TABLE}_doc_gin on ${TABLE} using gin (doc jsonb_path_ops);`
      );
    }).catch((err) => {
      cache.ready = null;
      throw err;
    });
  }
  return cache.ready;
}

async function readCollectionRaw(collection: string): Promise<Record<string, any>[]> {
  return withRetry(async () => {
    const sql = getSql();
    const rows = (await sql`select doc from ${sql(TABLE)} where collection = ${collection}`) as unknown as {
      doc: Record<string, any>;
    }[];
    return rows.map((row) => row.doc);
  });
}

export async function readCollection(collection: string): Promise<Record<string, any>[]> {
  if (batch) {
    let map = batch.collections.get(collection);
    if (!map) {
      map = new Map();
      for (const doc of await readCollectionRaw(collection)) map.set(String(doc._id), doc);
      batch.collections.set(collection, map);
    }
    return [...map.values()].map((doc) => ({ ...doc }));
  }
  return readCollectionRaw(collection);
}

export async function writeDocument(collection: string, doc: Record<string, any>): Promise<void> {
  await writeDocuments(collection, [doc]);
}

export async function writeDocuments(
  collection: string,
  docs: Record<string, any>[]
): Promise<void> {
  if (!docs.length) return;
  if (batch) {
    let map = batch.collections.get(collection);
    if (!map) {
      map = new Map();
      for (const doc of await readCollectionRaw(collection)) map.set(String(doc._id), doc);
      batch.collections.set(collection, map);
    }
    const deleted = batch.deleted.get(collection);
    for (const doc of docs) {
      const id = String(doc._id);
      map.set(id, doc);
      deleted?.delete(id);
    }
    return;
  }
  const sql = getSql();
  const chunkSize = 100;
  await withRetry(async () => {
    await sql.begin(async (tx) => {
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        const rows = chunk.map((doc) => ({
          collection,
          id: String(doc._id),
          doc,
        }));
        const placeholders: string[] = [];
        const params: unknown[] = [];
        rows.forEach((row, index) => {
          const base = index * 3;
          placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}::jsonb)`);
          params.push(row.collection, row.id, row.doc);
        });
        await tx.unsafe(
          `insert into ${TABLE} (collection, id, doc)
           values ${placeholders.join(", ")}
           on conflict (collection, id)
           do update set doc = excluded.doc, updated_at = now()`,
          params as any[]
        );
      }
    });
  });
}

export async function deleteDocument(collection: string, id: string): Promise<void> {
  if (batch) {
    batch.collections.get(collection)?.delete(id);
    let ids = batch.deleted.get(collection);
    if (!ids) {
      ids = new Set();
      batch.deleted.set(collection, ids);
    }
    ids.add(id);
    return;
  }
  const sql = getSql();
  await withRetry(async () => {
    await sql`delete from ${sql(TABLE)} where collection = ${collection} and id = ${id}`;
  });
}

export async function deleteDocuments(collection: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await withRetry(async () => {
    const sql = getSql();
    await sql`delete from ${sql(TABLE)} where collection = ${collection} and id in ${sql(ids)}`;
  });
}

export async function countDocumentsIn(collection: string): Promise<number> {
  return withRetry(async () => {
    const sql = getSql();
    const rows = (await sql`select count(*)::int as total from ${sql(TABLE)} where collection = ${collection}`) as unknown as {
      total: number;
    }[];
    return Number(rows[0]?.total || 0);
  });
}

export async function listCollections(): Promise<string[]> {
  return withRetry(async () => {
    const sql = getSql();
    const rows = (await sql`select distinct collection from ${sql(TABLE)} order by collection`) as unknown as {
      collection: string;
    }[];
    return rows.map((row) => row.collection);
  });
}

export async function dropAllData(): Promise<void> {
  if (batch) {
    batch.collections.clear();
    batch.deleted.clear();
  }
  await withRetry(async () => {
    const sql = getSql();
    await sql`delete from ${sql(TABLE)}`;
  });
}

export async function closeConnection(): Promise<void> {
  if (cache.sql) {
    const sql = cache.sql;
    cache.sql = null;
    cache.ready = null;
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}
