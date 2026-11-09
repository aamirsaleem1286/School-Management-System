import { closeConnection, dropAllData, ensureSchema, hasDatabaseUrl, listCollections } from "./client";
import { Schema, Types } from "./schema";
import { createModel, models } from "./model";
import { Document } from "./document";

export { Schema, Types, Document, models };
export { newObjectId } from "./model";
export { databaseUrl, hasDatabaseUrl, beginBatch, flushBatch, inBatch } from "./client";

export function model(name: string, schema: Schema) {
  return createModel(name, schema);
}

let readyState = 0;

const mongoose = {
  Schema,
  Types,
  models,
  Document,

  model(name: string, schema: Schema) {
    return createModel(name, schema);
  },

  async connect() {
    await ensureSchema();
    readyState = 1;
    return mongoose;
  },

  async disconnect() {
    await closeConnection();
    readyState = 0;
  },

  set() {
    return mongoose;
  },

  get connection() {
    return {
      get readyState() {
        return readyState;
      },
      db: {
        collections: async () => {
          const names = await listCollections();
          return names.map((collectionName) => ({
            collectionName,
            deleteMany: async () => undefined,
          }));
        },
        dropDatabase: async () => {
          await dropAllData();
        },
      },
    };
  },
};

export default mongoose;
