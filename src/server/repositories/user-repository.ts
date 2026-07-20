import "server-only";

import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { experts, users, type NewUser } from "@/server/db/schema";

export async function findUserByEmail(email: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return user ?? null;
}

export async function findUserById(id: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function createUser(input: NewUser) {
  const db = getDb();
  const [user] = await db
    .insert(users)
    .values({ ...input, email: input.email.toLowerCase() })
    .returning();
  return user;
}

export async function revokeUserSessions(id: string, currentVersion: number) {
  const db = getDb();
  const [user] = await db
    .update(users)
    .set({
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date()
    })
    .where(and(eq(users.id, id), eq(users.sessionVersion, currentVersion)))
    .returning({ id: users.id });
  return Boolean(user);
}

export async function listAssignableExpertUsers(currentExpertId?: string) {
  const db = getDb();
  const availableLink = currentExpertId
    ? or(isNull(experts.id), eq(experts.id, currentExpertId))
    : isNull(experts.id);

  return db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName
    })
    .from(users)
    .leftJoin(experts, eq(experts.userId, users.id))
    .where(and(eq(users.isActive, true), eq(users.role, "expert"), availableLink))
    .orderBy(users.fullName);
}
