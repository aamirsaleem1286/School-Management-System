import mongoose from "mongoose";

const DEFAULT_LOCAL_URI = "mongodb://127.0.0.1:27017/school_erp";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memory: unknown;
};

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache =
  globalThis.__mongooseCache ?? (globalThis.__mongooseCache = { conn: null, promise: null, memory: null });

async function resolveUri(): Promise<string> {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  // Zero-config local development: start a persistent MongoDB instance.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MONGODB_URI is required in production. Configure a MongoDB Atlas or self-hosted connection string."
    );
  }

  if (!cache.memory) {
    process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || "7.0.14";
    process.env.MONGOMS_DISABLE_POSTINSTALL = "1";
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dbPath = path.join(process.cwd(), ".data", "mongodb");
    fs.mkdirSync(dbPath, { recursive: true });
    cache.memory = await MongoMemoryServer.create({
      instance: {
        dbPath,
        storageEngine: "wiredTiger",
        dbName: "school_erp",
      },
    });
    const uri = (cache.memory as { getUri: () => string }).getUri();
    console.log(`[db] Started local MongoDB at ${uri} (data: ${dbPath})`);
  }

  return (cache.memory as { getUri: () => string }).getUri();
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    cache.promise = (async () => {
      const uri = await resolveUri();
      mongoose.set("strictQuery", true);
      const conn = await mongoose.connect(uri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
        dbName: process.env.MONGODB_URI ? undefined : "school_erp",
      });
      return conn;
    })().catch((err) => {
      cache.promise = null;
      throw err;
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export { DEFAULT_LOCAL_URI };
