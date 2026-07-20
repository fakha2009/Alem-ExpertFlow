import "server-only";

import type { SQL } from "drizzle-orm";
import { getDb } from "@/server/db";

export async function executeRows<T>(query: SQL<unknown>): Promise<T[]> {
  const rows = await getDb().execute(query);
  return rows as unknown as T[];
}
