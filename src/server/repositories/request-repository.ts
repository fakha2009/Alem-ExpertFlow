import "server-only";

import { and, eq, sql } from "drizzle-orm";
import {
  isActiveRequestStatus,
  PAGE_SIZE,
  type RequestPriority,
  type RequestStatus,
  type SkillImportance
} from "@/lib/constants";
import { invalidateAnalyticsCache } from "@/server/cache/analytics-cache";
import { getDb } from "@/server/db";
import { executeRows } from "@/server/db/query";
import {
  activityLogs,
  assignments,
  comments,
  experts,
  requests,
  requestSkills,
  skills
} from "@/server/db/schema";
import type { SessionUser } from "@/server/permissions/rbac";
import type { RequestInput, RequestListQuery } from "@/server/validators/request";

export type RequestListItem = {
  id: string;
  publicId: string;
  title: string;
  category: string;
  priority: RequestPriority;
  status: RequestStatus;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdByName: string;
  assignedExpertName: string | null;
  skillNames: string[];
  commentsCount: number;
};

export type RequestDetail = {
  id: string;
  publicId: string;
  title: string;
  description: string;
  category: string;
  priority: RequestPriority;
  status: RequestStatus;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  createdById: string;
  createdByName: string;
  assignedExpertId: string | null;
  assignedExpertUserId: string | null;
  assignedExpertName: string | null;
  skills: Array<{
    skillId: string;
    name: string;
    category: string;
    importance: SkillImportance;
  }>;
  comments: Array<{
    id: string;
    body: string;
    authorName: string;
    authorRole: string;
    createdAt: Date;
  }>;
  activity: Array<{
    id: string;
    action: string;
    actorName: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }>;
  assignments: Array<{
    id: string;
    expertId: string;
    expertName: string;
    score: number;
    explanation: string;
    status: string;
    createdAt: Date;
  }>;
};

function toDeadline(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function makePublicId() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `REQ-${stamp}-${suffix}`;
}

async function getExpertIdForUser(userId: string) {
  const db = getDb();
  const [row] = await db.select({ id: experts.id }).from(experts).where(eq(experts.userId, userId)).limit(1);
  return row?.id ?? null;
}

function getOrder(sort: RequestListQuery["sort"]) {
  if (sort === "deadline") return sql`r.deadline asc nulls last, r.created_at desc`;
  if (sort === "priority") {
    return sql`case r.priority when 'urgent' then 4 when 'high' then 3 when 'medium' then 2 else 1 end desc, r.created_at desc`;
  }
  return sql`r.created_at desc`;
}

export async function listRequests(user: SessionUser, query: RequestListQuery) {
  const page = Math.max(query.page, 1);
  const offset = (page - 1) * PAGE_SIZE;
  const conditions = [sql`true`];

  if (user.role === "expert") {
    const expertId = await getExpertIdForUser(user.id);
    if (!expertId) return { rows: [] as RequestListItem[], total: 0, page, pageCount: 0 };
    conditions.push(sql`r.assigned_expert_id = ${expertId}`);
  }

  if (query.status) conditions.push(sql`r.status = ${query.status}`);
  if (query.priority) conditions.push(sql`r.priority = ${query.priority}`);
  if (query.category) conditions.push(sql`r.category = ${query.category}`);
  if (query.q) {
    const term = `%${query.q.trim()}%`;
    conditions.push(sql`(r.title ilike ${term} or r.description ilike ${term} or r.public_id ilike ${term})`);
  }

  const where = sql.join(conditions, sql` and `);
  const orderBy = getOrder(query.sort);

  const rows = await executeRows<RequestListItem>(sql`
    select
      r.id,
      r.public_id as "publicId",
      r.title,
      r.category,
      r.priority,
      r.status,
      r.deadline,
      r.created_at as "createdAt",
      r.updated_at as "updatedAt",
      creator.full_name as "createdByName",
      e.full_name as "assignedExpertName",
      coalesce(array_remove(array_agg(distinct s.name), null), '{}') as "skillNames",
      count(distinct c.id)::int as "commentsCount"
    from requests r
    join users creator on creator.id = r.created_by_id
    left join experts e on e.id = r.assigned_expert_id
    left join request_skills rs on rs.request_id = r.id
    left join skills s on s.id = rs.skill_id
    left join comments c on c.request_id = r.id
    where ${where}
    group by r.id, creator.full_name, e.full_name
    order by ${orderBy}
    limit ${PAGE_SIZE}
    offset ${offset}
  `);

  const [countRow] = await executeRows<{ total: number }>(sql`
    select count(*)::int as total
    from requests r
    where ${where}
  `);

  const total = countRow?.total ?? 0;
  return {
    rows,
    total,
    page,
    pageCount: Math.ceil(total / PAGE_SIZE)
  };
}

export async function listRequestCategories(user: SessionUser) {
  const conditions = [sql`true`];

  if (user.role === "expert") {
    const expertId = await getExpertIdForUser(user.id);
    if (!expertId) return [];
    conditions.push(sql`assigned_expert_id = ${expertId}`);
  }

  const where = sql.join(conditions, sql` and `);
  const rows = await executeRows<{ category: string }>(sql`
    select distinct category
    from requests
    where ${where}
    order by category asc
  `);

  return rows.map((row) => row.category);
}

export async function getRequestDetail(id: string, user: SessionUser): Promise<RequestDetail | null> {
  const [request] = await executeRows<Omit<RequestDetail, "skills" | "comments" | "activity" | "assignments">>(sql`
    select
      r.id,
      r.public_id as "publicId",
      r.title,
      r.description,
      r.category,
      r.priority,
      r.status,
      r.deadline,
      r.created_at as "createdAt",
      r.updated_at as "updatedAt",
      r.completed_at as "completedAt",
      r.created_by_id as "createdById",
      creator.full_name as "createdByName",
      r.assigned_expert_id as "assignedExpertId",
      e.user_id as "assignedExpertUserId",
      e.full_name as "assignedExpertName"
    from requests r
    join users creator on creator.id = r.created_by_id
    left join experts e on e.id = r.assigned_expert_id
    where r.id = ${id}
    limit 1
  `);

  if (!request) return null;
  if (user.role === "expert" && request.assignedExpertUserId !== user.id) return null;

  const [skillRows, commentRows, activityRows, assignmentRows] = await Promise.all([
    executeRows<RequestDetail["skills"][number]>(sql`
      select
        s.id as "skillId",
        s.name,
        s.category,
        rs.importance
      from request_skills rs
      join skills s on s.id = rs.skill_id
      where rs.request_id = ${id}
      order by
        case rs.importance when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end desc,
        s.name asc
    `),
    executeRows<RequestDetail["comments"][number]>(sql`
      select
        c.id,
        c.body,
        u.full_name as "authorName",
        u.role as "authorRole",
        c.created_at as "createdAt"
      from comments c
      join users u on u.id = c.author_id
      where c.request_id = ${id}
      order by c.created_at asc
    `),
    executeRows<RequestDetail["activity"][number]>(sql`
      select
        al.id,
        al.action,
        u.full_name as "actorName",
        al.metadata,
        al.created_at as "createdAt"
      from activity_logs al
      left join users u on u.id = al.actor_id
      where al.entity_type = 'request' and al.entity_id = ${id}
      order by al.created_at desc
      limit 20
    `),
    executeRows<RequestDetail["assignments"][number]>(sql`
      select
        a.id,
        a.expert_id as "expertId",
        e.full_name as "expertName",
        a.score,
        a.explanation,
        a.status,
        a.created_at as "createdAt"
      from assignments a
      join experts e on e.id = a.expert_id
      where a.request_id = ${id}
      order by a.created_at desc
      limit 10
    `)
  ]);

  return {
    ...request,
    skills: skillRows,
    comments: commentRows,
    activity: activityRows,
    assignments: assignmentRows
  };
}

export async function createRequest(input: RequestInput, actor: SessionUser) {
  const db = getDb();
  const created = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(requests)
      .values({
        publicId: makePublicId(),
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        status: "new",
        deadline: toDeadline(input.deadline),
        createdById: actor.id,
        assignedExpertId: null
      })
      .returning();

    if (input.skills.length > 0) {
      await tx.insert(requestSkills).values(
        input.skills.map((skill) => ({
          requestId: created.id,
          skillId: skill.skillId,
          importance: skill.importance
        }))
      );
    }

    await tx.insert(activityLogs).values({
      actorId: actor.id,
      action: "request.created",
      entityType: "request",
      entityId: created.id,
      metadata: { publicId: created.publicId, title: created.title }
    });

    return created;
  });

  await invalidateAnalyticsCache();
  return created;
}

export async function updateRequest(id: string, input: RequestInput, actor: SessionUser) {
  const db = getDb();
  const updated = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(requests)
      .set({
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        deadline: toDeadline(input.deadline),
        updatedAt: new Date()
      })
      .where(eq(requests.id, id))
      .returning();

    if (!updated) return null;

    await tx.delete(requestSkills).where(eq(requestSkills.requestId, id));
    await tx.insert(requestSkills).values(
      input.skills.map((skill) => ({
        requestId: id,
        skillId: skill.skillId,
        importance: skill.importance
      }))
    );

    await tx.insert(activityLogs).values({
      actorId: actor.id,
      action: "request.updated",
      entityType: "request",
      entityId: id,
      metadata: { publicId: updated.publicId, title: updated.title }
    });

    return updated;
  });

  if (updated) await invalidateAnalyticsCache();
  return updated;
}

export async function deleteRequest(id: string, actor: SessionUser) {
  const db = getDb();
  const deleted = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        id: requests.id,
        status: requests.status,
        assignedExpertId: requests.assignedExpertId
      })
      .from(requests)
      .where(eq(requests.id, id))
      .limit(1)
      .for("update");

    if (!current) return false;

    if (current.assignedExpertId && isActiveRequestStatus(current.status)) {
      await tx.execute(sql`
        update experts
        set current_load = greatest(current_load - 1, 0), updated_at = now()
        where id = ${current.assignedExpertId}
      `);
    }

    await tx.insert(activityLogs).values({
      actorId: actor.id,
      action: "request.deleted",
      entityType: "request",
      entityId: id,
      metadata: { status: current.status, assignedExpertId: current.assignedExpertId }
    });
    await tx.delete(requests).where(eq(requests.id, id));
    return true;
  });
  if (deleted) await invalidateAnalyticsCache();
  return deleted;
}

export async function changeRequestStatus(
  id: string,
  expectedStatus: RequestStatus,
  status: RequestStatus,
  actor: SessionUser
) {
  const db = getDb();
  const updated = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        id: requests.id,
        status: requests.status,
        assignedExpertId: requests.assignedExpertId
      })
      .from(requests)
      .where(eq(requests.id, id))
      .limit(1)
      .for("update");

    if (!current || current.status !== expectedStatus) return null;

    const leavingActiveState = isActiveRequestStatus(current.status) && !isActiveRequestStatus(status);
    if (current.assignedExpertId && leavingActiveState) {
      await tx.execute(sql`
        update experts
        set
          current_load = greatest(current_load - 1, 0),
          completed_requests_count = completed_requests_count + ${status === "done" ? 1 : 0},
          updated_at = now()
        where id = ${current.assignedExpertId}
      `);
    }

    const [request] = await tx
      .update(requests)
      .set({
        status,
        completedAt: status === "done" ? new Date() : null,
        updatedAt: new Date()
      })
      .where(and(eq(requests.id, id), eq(requests.status, expectedStatus)))
      .returning();

    if (!request) return null;

    await tx.insert(activityLogs).values({
      actorId: actor.id,
      action: "request.status_changed",
      entityType: "request",
      entityId: id,
      metadata: { from: current.status, to: status }
    });

    return request;
  });

  if (updated) await invalidateAnalyticsCache();
  return updated;
}

export async function addRequestComment(id: string, body: string, actor: SessionUser) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(comments)
      .values({
        requestId: id,
        authorId: actor.id,
        body
      })
      .returning();

    await tx.insert(activityLogs).values({
      actorId: actor.id,
      action: "comment.created",
      entityType: "request",
      entityId: id,
      metadata: { commentId: created.id }
    });

    return created;
  });
}

export async function assignExpertToRequest(input: {
  requestId: string;
  expertId: string;
  score: number;
  explanation: string;
  actor: SessionUser;
}) {
  const db = getDb();
  const request = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ assignedExpertId: requests.assignedExpertId, status: requests.status })
      .from(requests)
      .where(eq(requests.id, input.requestId))
      .limit(1)
      .for("update");

    if (!current || current.status === "done" || current.status === "rejected") return null;

    const [candidate] = await tx
      .select({
        id: experts.id,
        isAvailable: experts.isAvailable,
        currentLoad: experts.currentLoad,
        maxActiveRequests: experts.maxActiveRequests
      })
      .from(experts)
      .where(eq(experts.id, input.expertId))
      .limit(1)
      .for("update");

    if (!candidate || !candidate.isAvailable || candidate.currentLoad >= candidate.maxActiveRequests) {
      return null;
    }

    if (current.assignedExpertId && current.assignedExpertId !== input.expertId) {
      await tx.execute(sql`
        update experts
        set current_load = greatest(current_load - 1, 0), updated_at = now()
        where id = ${current.assignedExpertId}
      `);
    }

    if (current.assignedExpertId !== input.expertId) {
      await tx.execute(sql`
        update experts
        set current_load = current_load + 1, updated_at = now()
        where id = ${input.expertId}
      `);
    }

    await tx
      .update(assignments)
      .set({ status: "declined", updatedAt: new Date() })
      .where(and(eq(assignments.requestId, input.requestId), eq(assignments.status, "assigned")));

    const [assignment] = await tx
      .insert(assignments)
      .values({
        requestId: input.requestId,
        expertId: input.expertId,
        assignedById: input.actor.id,
        score: input.score,
        explanation: input.explanation,
        status: "assigned"
      })
      .returning();

    const [request] = await tx
      .update(requests)
      .set({
        assignedExpertId: input.expertId,
        status: "assigned",
        updatedAt: new Date()
      })
      .where(eq(requests.id, input.requestId))
      .returning();

    await tx.insert(activityLogs).values({
      actorId: input.actor.id,
      action: "request.assigned",
      entityType: "request",
      entityId: input.requestId,
      metadata: {
        expertId: input.expertId,
        assignmentId: assignment.id,
        score: input.score
      }
    });

    return request;
  });

  if (request) await invalidateAnalyticsCache();
  return request;
}

export async function getRequestSkillsForMatching(requestId: string) {
  const db = getDb();
  return db
    .select({
      skillId: requestSkills.skillId,
      importance: requestSkills.importance,
      name: skills.name
    })
    .from(requestSkills)
    .innerJoin(skills, eq(skills.id, requestSkills.skillId))
    .where(eq(requestSkills.requestId, requestId));
}

export async function getExpertPoolForMatching() {
  const rows = await executeRows<{
    expertId: string;
    fullName: string;
    currentLoad: number;
    maxActiveRequests: number;
    rating: string;
    isAvailable: boolean;
    responseTimeHours: number;
    completedRequestsCount: number;
    skillId: string | null;
    skillName: string | null;
    level: number | null;
    yearsExperience: number | null;
    verified: boolean | null;
  }>(sql`
    with candidate_experts as (
      select *
      from experts
      where is_available = true and current_load < max_active_requests
      order by rating desc, current_load asc
      limit 100
    )
    select
      e.id as "expertId",
      e.full_name as "fullName",
      e.current_load as "currentLoad",
      e.max_active_requests as "maxActiveRequests",
      e.rating,
      e.is_available as "isAvailable",
      e.response_time_hours as "responseTimeHours",
      e.completed_requests_count as "completedRequestsCount",
      es.skill_id as "skillId",
      s.name as "skillName",
      es.level,
      es.years_experience as "yearsExperience",
      es.verified
    from candidate_experts e
    left join expert_skills es on es.expert_id = e.id
    left join skills s on s.id = es.skill_id
    order by e.rating desc, e.current_load asc
  `);

  return rows;
}

export async function requestExists(id: string) {
  const db = getDb();
  const [row] = await db.select({ id: requests.id }).from(requests).where(eq(requests.id, id)).limit(1);
  return Boolean(row);
}

export async function getAccessibleRequestSummary(user: SessionUser, requestId: string) {
  const expertCondition = user.role === "expert" ? sql`and e.user_id = ${user.id}` : sql``;
  const [row] = await executeRows<{
    status: RequestStatus;
    assignedExpertId: string | null;
  }>(sql`
    select r.status, r.assigned_expert_id as "assignedExpertId"
    from requests r
    left join experts e on e.id = r.assigned_expert_id
    where r.id = ${requestId} ${expertCondition}
    limit 1
  `);
  return row ?? null;
}

export async function userCanAccessRequest(user: SessionUser, requestId: string) {
  if (user.role !== "expert") return true;
  const db = getDb();
  const [row] = await db
    .select({ id: requests.id })
    .from(requests)
    .innerJoin(experts, eq(experts.id, requests.assignedExpertId))
    .where(and(eq(requests.id, requestId), eq(experts.userId, user.id)))
    .limit(1);
  return Boolean(row);
}
