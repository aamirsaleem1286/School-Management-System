import { ensureSchema, hasDatabaseUrl } from "./pgdb/client";
import { ensureDemoData } from "./demo-seed";

type DbCache = {
  ready: Promise<void> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __dbConnectCache: DbCache | undefined;
}

const cache: DbCache = globalThis.__dbConnectCache ?? (globalThis.__dbConnectCache = { ready: null });

export async function dbConnect(): Promise<void> {
  if (!cache.ready) {
    cache.ready = (async () => {
      if (!hasDatabaseUrl()) {
        throw new Error(
          "DATABASE_URL is required. Set it to your Neon/Postgres connection string (see .env.example)."
        );
      }
      await ensureSchema();
      if (process.env.SKIP_DEMO_SEED !== "1") {
        await ensureDemoData().catch((e) => console.warn("[db] Demo check notice:", e?.message));
      }
    })().catch((err) => {
      cache.ready = null;
      throw err;
    });
  }
  return cache.ready;
}
