import "server-only";
import path from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

/** Applies pending migrations. Safe to call on every boot. */
export async function runMigrations() {
  await db.run(sql`PRAGMA foreign_keys = ON`);
  await db.run(sql`PRAGMA journal_mode = WAL`).catch(() => {
    // Hosted libSQL manages its own journal; ignore.
  });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}
