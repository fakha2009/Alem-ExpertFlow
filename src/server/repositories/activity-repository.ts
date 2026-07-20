import "server-only";

import { desc, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { executeRows } from "@/server/db/query";
import { activityLogs } from "@/server/db/schema";
import type { SessionUser } from "@/server/permissions/rbac";

export type ActivityItem = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export async function createActivity(input: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(activityLogs).values({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {}
  });
}

export async function listActivity(limit = 40, user?: SessionUser) {
  const scope = user?.role === "expert"
    ? sql`where al.entity_type = 'request' and exists (
        select 1
        from requests r
        join experts e on e.id = r.assigned_expert_id
        where r.id = al.entity_id and e.user_id = ${user.id}
      )`
    : sql``;
  return executeRows<ActivityItem>(sql`
    select
      al.id,
      al.actor_id as "actorId",
      u.full_name as "actorName",
      al.action,
      al.entity_type as "entityType",
      al.entity_id as "entityId",
      al.metadata,
      al.created_at as "createdAt"
    from activity_logs al
    left join users u on u.id = al.actor_id
    ${scope}
    order by al.created_at desc
    limit ${limit}
  `);
}

export async function listRecentActivity(limit = 8) {
  const db = getDb();
  return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
}
