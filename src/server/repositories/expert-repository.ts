import "server-only";

import { and, eq, ne, sql } from "drizzle-orm";
import { PAGE_SIZE, type ExpertType, type RequestPriority, type RequestStatus } from "@/lib/constants";
import { invalidateAnalyticsCache } from "@/server/cache/analytics-cache";
import { deleteRedisKeys, withRedisCache } from "@/server/cache/redis";
import { getDb } from "@/server/db";
import { executeRows } from "@/server/db/query";
import { activityLogs, expertSkills, experts, users } from "@/server/db/schema";
import type { SessionUser } from "@/server/permissions/rbac";
import type { ExpertInput, ExpertListQuery } from "@/server/validators/expert";

const EXPERT_OPTIONS_CACHE_KEY = "aef:experts:options:v1";
const EXPERT_OPTIONS_CACHE_TTL_SECONDS = 30;

export type ExpertListItem = {
  id: string;
  userId: string | null;
  fullName: string;
  type: ExpertType;
  currentLoad: number;
  maxActiveRequests: number;
  rating: string;
  isAvailable: boolean;
  responseTimeHours: number;
  completedRequestsCount: number;
  skillNames: string[];
  activeRequestsCount: number;
};

export type ExpertDetail = ExpertListItem & {
  bio: string;
  createdAt: Date;
  updatedAt: Date;
  skills: Array<{
    skillId: string;
    name: string;
    category: string;
    level: number;
    yearsExperience: number;
    verified: boolean;
  }>;
  assignments: Array<{
    requestId: string;
    publicId: string;
    title: string;
    status: RequestStatus;
    priority: RequestPriority;
    deadline: Date | null;
  }>;
};

async function invalidateExpertReferenceCache() {
  await deleteRedisKeys([EXPERT_OPTIONS_CACHE_KEY]);
}

function integrityError(message: string) {
  const error = new Error(message);
  error.name = "ConflictError";
  return error;
}

async function assertLinkedExpertUser(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  userId: string | null | undefined,
  currentExpertId?: string
) {
  if (!userId) return;

  const [user] = await tx
    .select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.isActive || user.role !== "expert") {
    throw integrityError("Linked user must be an active expert account.");
  }

  const linkCondition = currentExpertId
    ? and(eq(experts.userId, userId), ne(experts.id, currentExpertId))
    : eq(experts.userId, userId);
  const [existingLink] = await tx
    .select({ id: experts.id })
    .from(experts)
    .where(linkCondition)
    .limit(1);

  if (existingLink) {
    throw integrityError("This user account is already linked to another expert.");
  }
}

function getOrder(sort: ExpertListQuery["sort"]) {
  if (sort === "load") return sql`(e.current_load::float / nullif(e.max_active_requests, 0)) asc, e.rating desc`;
  if (sort === "completed") return sql`e.completed_requests_count desc, e.rating desc`;
  return sql`e.rating desc, e.current_load asc`;
}

export async function listExperts(query: ExpertListQuery) {
  const page = Math.max(query.page, 1);
  const offset = (page - 1) * PAGE_SIZE;
  const conditions = [sql`true`];

  if (query.type) conditions.push(sql`e.type = ${query.type}`);
  if (query.available === "true") conditions.push(sql`e.is_available = true`);
  if (query.available === "false") conditions.push(sql`e.is_available = false`);
  if (query.q) {
    const term = `%${query.q.trim()}%`;
    conditions.push(sql`(e.full_name ilike ${term} or e.bio ilike ${term} or s.name ilike ${term})`);
  }

  const where = sql.join(conditions, sql` and `);
  const orderBy = getOrder(query.sort);

  const rows = await executeRows<ExpertListItem>(sql`
    select
      e.id,
      e.user_id as "userId",
      e.full_name as "fullName",
      e.type,
      e.current_load as "currentLoad",
      e.max_active_requests as "maxActiveRequests",
      e.rating,
      e.is_available as "isAvailable",
      e.response_time_hours as "responseTimeHours",
      e.completed_requests_count as "completedRequestsCount",
      coalesce(array_remove(array_agg(distinct s.name), null), '{}') as "skillNames",
      count(distinct r.id)::int as "activeRequestsCount"
    from experts e
    left join expert_skills es on es.expert_id = e.id
    left join skills s on s.id = es.skill_id
    left join requests r on r.assigned_expert_id = e.id and r.status in ('assigned', 'in_progress', 'review')
    where ${where}
    group by e.id
    order by ${orderBy}
    limit ${PAGE_SIZE}
    offset ${offset}
  `);

  const [countRow] = await executeRows<{ total: number }>(sql`
    select count(distinct e.id)::int as total
    from experts e
    left join expert_skills es on es.expert_id = e.id
    left join skills s on s.id = es.skill_id
    where ${where}
  `);

  const total = countRow?.total ?? 0;
  return { rows, total, page, pageCount: Math.ceil(total / PAGE_SIZE) };
}

export async function getExpertDetail(id: string): Promise<ExpertDetail | null> {
  const [expert] = await executeRows<Omit<ExpertDetail, "skills" | "assignments">>(sql`
    select
      e.id,
      e.user_id as "userId",
      e.full_name as "fullName",
      e.type,
      e.bio,
      e.current_load as "currentLoad",
      e.max_active_requests as "maxActiveRequests",
      e.rating,
      e.is_available as "isAvailable",
      e.response_time_hours as "responseTimeHours",
      e.completed_requests_count as "completedRequestsCount",
      e.created_at as "createdAt",
      e.updated_at as "updatedAt",
      coalesce(array_remove(array_agg(distinct s.name), null), '{}') as "skillNames",
      count(distinct ar.id)::int as "activeRequestsCount"
    from experts e
    left join expert_skills es on es.expert_id = e.id
    left join skills s on s.id = es.skill_id
    left join requests ar on ar.assigned_expert_id = e.id and ar.status in ('assigned', 'in_progress', 'review')
    where e.id = ${id}
    group by e.id
    limit 1
  `);

  if (!expert) return null;

  const [skillRows, assignmentRows] = await Promise.all([
    executeRows<ExpertDetail["skills"][number]>(sql`
      select
        s.id as "skillId",
        s.name,
        s.category,
        es.level,
        es.years_experience as "yearsExperience",
        es.verified
      from expert_skills es
      join skills s on s.id = es.skill_id
      where es.expert_id = ${id}
      order by es.level desc, s.name asc
    `),
    executeRows<ExpertDetail["assignments"][number]>(sql`
      select
        r.id as "requestId",
        r.public_id as "publicId",
        r.title,
        r.status,
        r.priority,
        r.deadline
      from requests r
      where r.assigned_expert_id = ${id}
      order by r.created_at desc
      limit 20
    `)
  ]);

  return {
    ...expert,
    skills: skillRows,
    assignments: assignmentRows
  };
}

export async function createExpert(input: ExpertInput, actor: SessionUser) {
  const db = getDb();
  const expert = await db.transaction(async (tx) => {
    await assertLinkedExpertUser(tx, input.userId);

    const [expert] = await tx
      .insert(experts)
      .values({
        userId: input.userId ?? null,
        fullName: input.fullName,
        type: input.type,
        bio: input.bio,
        maxActiveRequests: input.maxActiveRequests,
        rating: input.rating.toFixed(2),
        isAvailable: input.isAvailable,
        responseTimeHours: input.responseTimeHours,
        completedRequestsCount: 0
      })
      .returning();

    await tx.insert(expertSkills).values(
      input.skills.map((skill) => ({
        expertId: expert.id,
        skillId: skill.skillId,
        level: skill.level,
        yearsExperience: skill.yearsExperience,
        verified: skill.verified
      }))
    );

    await tx.insert(activityLogs).values({
      actorId: actor.id,
      action: "expert.created",
      entityType: "expert",
      entityId: expert.id,
      metadata: { fullName: expert.fullName, type: expert.type }
    });

    return expert;
  });

  await invalidateAnalyticsCache();
  await invalidateExpertReferenceCache();
  return expert;
}

export async function updateExpert(id: string, input: ExpertInput, actor: SessionUser) {
  const db = getDb();
  const expert = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: experts.id, currentLoad: experts.currentLoad })
      .from(experts)
      .where(eq(experts.id, id))
      .limit(1)
      .for("update");

    if (!current) return null;
    if (input.maxActiveRequests < current.currentLoad) {
      throw integrityError("Capacity cannot be lower than the current active load.");
    }
    await assertLinkedExpertUser(tx, input.userId, id);

    const [expert] = await tx
      .update(experts)
      .set({
        userId: input.userId ?? null,
        fullName: input.fullName,
        type: input.type,
        bio: input.bio,
        maxActiveRequests: input.maxActiveRequests,
        rating: input.rating.toFixed(2),
        isAvailable: input.isAvailable,
        responseTimeHours: input.responseTimeHours,
        updatedAt: new Date()
      })
      .where(eq(experts.id, id))
      .returning();

    if (!expert) return null;

    await tx.delete(expertSkills).where(eq(expertSkills.expertId, id));
    await tx.insert(expertSkills).values(
      input.skills.map((skill) => ({
        expertId: id,
        skillId: skill.skillId,
        level: skill.level,
        yearsExperience: skill.yearsExperience,
        verified: skill.verified
      }))
    );

    await tx.insert(activityLogs).values({
      actorId: actor.id,
      action: "expert.updated",
      entityType: "expert",
      entityId: id,
      metadata: { fullName: expert.fullName }
    });

    return expert;
  });

  if (expert) {
    await invalidateAnalyticsCache();
    await invalidateExpertReferenceCache();
  }
  return expert;
}

export async function getExpertOptions() {
  return withRedisCache(EXPERT_OPTIONS_CACHE_KEY, EXPERT_OPTIONS_CACHE_TTL_SECONDS, async () => {
    const db = getDb();
    return db
      .select({
        id: experts.id,
        fullName: experts.fullName,
        isAvailable: experts.isAvailable
      })
      .from(experts)
      .orderBy(experts.fullName);
  });
}
