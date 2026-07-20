import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type SqlClient = ReturnType<typeof postgres>;
type DbClient = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __alemSql?: SqlClient;
  __alemDb?: DbClient;
};

function createSqlClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured. Set the Supabase pooled connection string.");
  }

  return postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: process.env.VERCEL ? 5 : 20,
    connect_timeout: 10
  });
}

export function getDb() {
  if (!globalForDb.__alemSql) {
    globalForDb.__alemSql = createSqlClient();
  }

  if (!globalForDb.__alemDb) {
    globalForDb.__alemDb = drizzle(globalForDb.__alemSql, { schema });
  }

  return globalForDb.__alemDb;
}

export async function closeDb() {
  await globalForDb.__alemSql?.end();
  globalForDb.__alemSql = undefined;
  globalForDb.__alemDb = undefined;
}
