import { PGlite } from "@electric-sql/pglite";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { resolve } from "node:path";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
const state = globalThis as typeof globalThis & {
  dayoneDatabase?: Database;
  dayoneDatabaseClient?: PGlite | Pool;
  dayoneHosted?: boolean;
};

function connect(): Database {
  const url = process.env.DATABASE_URL?.trim();
  if (process.env.VERCEL && !url) {
    throw new Error("Set DATABASE_URL to your Supabase PostgreSQL pooler connection URL in Vercel. Local embedded storage is for the Windows demo only.");
  }
  if (url) {
    state.dayoneHosted = true;
    const client = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
    state.dayoneDatabaseClient = client;
    return pgDrizzle(client, { schema }) as unknown as Database;
  }
  // ponytail: single-process local PostgreSQL; DATABASE_URL selects shared hosted storage.
  const client = new PGlite(process.env.DAYONE_DB_PATH === ":memory:" ? undefined : resolve(process.env.DAYONE_DB_PATH || ".dayone/db"));
  state.dayoneHosted = false;
  state.dayoneDatabaseClient = client;
  return pgliteDrizzle(client, { schema }) as unknown as Database;
}

function getDatabase(): Database {
  return state.dayoneDatabase ?? (state.dayoneDatabase = connect());
}

// Next imports routes in parallel build workers. Open storage only for a real query.
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDatabase();
    const value = Reflect.get(database, property);
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export async function closeDb() {
  const client = state.dayoneDatabaseClient;
  if (client && !state.dayoneHosted) await (client as PGlite).close();
  else if (client) await (client as Pool).end();
  delete state.dayoneDatabase;
  delete state.dayoneDatabaseClient;
  delete state.dayoneHosted;
}

export function databaseClient() {
  getDatabase();
  return state.dayoneDatabaseClient!;
}

export function isHostedDatabase() { return state.dayoneHosted === true; }
