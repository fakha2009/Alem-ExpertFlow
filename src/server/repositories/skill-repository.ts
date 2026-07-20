import "server-only";

import { asc, eq } from "drizzle-orm";
import { deleteRedisKeys, withRedisCache } from "@/server/cache/redis";
import { getDb } from "@/server/db";
import { skills } from "@/server/db/schema";
import type { SkillInput } from "@/server/validators/skill";

const SKILLS_CACHE_KEY = "aef:skills:list:v1";
const SKILLS_CACHE_TTL_SECONDS = 60;

async function invalidateSkillsCache() {
  await deleteRedisKeys([SKILLS_CACHE_KEY]);
}

export async function listSkills() {
  return withRedisCache(SKILLS_CACHE_KEY, SKILLS_CACHE_TTL_SECONDS, async () => {
    const db = getDb();
    return db.select().from(skills).orderBy(asc(skills.category), asc(skills.name));
  });
}

export async function createSkill(input: SkillInput) {
  const db = getDb();
  const [skill] = await db.insert(skills).values(input).returning();
  await invalidateSkillsCache();
  return skill;
}

export async function updateSkill(id: string, input: SkillInput) {
  const db = getDb();
  const [skill] = await db
    .update(skills)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(skills.id, id))
    .returning();
  if (skill) await invalidateSkillsCache();
  return skill ?? null;
}

export async function deleteSkill(id: string) {
  const db = getDb();
  await db.delete(skills).where(eq(skills.id, id));
  await invalidateSkillsCache();
}
