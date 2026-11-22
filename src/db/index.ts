import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const DATA_DIR = path.resolve(/* turbopackIgnore: true */ process.env.PUNCHFACE_DATA_DIR ?? "./data");

/**
 * A local SQLite file by default. Point DATABASE_URL at a libSQL/Turso
 * database (plus DATABASE_AUTH_TOKEN) to move to a hosted database without
 * touching the schema or queries.
 */
const url = process.env.DATABASE_URL ?? `file:${path.join(DATA_DIR, "punchface.db")}`;

type Db = LibSQLDatabase<typeof schema>;

// Reuse one connection across dev hot reloads.
const globalForDb = globalThis as unknown as { __pfClient?: Client; __pfDb?: Db };

function connect(): Db {
  if (url.startsWith("file:")) {
    mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  }
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  globalForDb.__pfClient = client;
  return drizzle(client, { schema });
}

export const db: Db = (globalForDb.__pfDb ??= connect());

export { schema };
