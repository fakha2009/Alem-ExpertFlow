import "server-only";

import { sql } from "drizzle-orm";
import type { RequestPriority, RequestStatus } from "@/lib/constants";
import { analyticsCacheKeys, withAnalyticsCache } from "@/server/cache/analytics-cache";
import { executeRows } from "@/server/db/query";
import type { SessionUser } from "@/server/permissions/rbac";

export type DashboardMetrics = {
  totalRequests: number;
  newRequests: number;
  inProgressRequests: number;
  doneRequests: number;
  averageProcessingHours: number;
  activeExperts: number;
  averageExpertLoad: number;
  overdueRequests: number;
  averageAssignmentScore: number;
};

async function loadDashboardMetrics(): Promise<DashboardMetrics> {
  const [row] = await executeRows<DashboardMetrics>(sql`
    select
      count(r.id)::int as "totalRequests",
      count(*) filter (where r.status = 'new')::int as "newRequests",
      count(*) filter (where r.status in ('assigned', 'in_progress', 'review'))::int as "inProgressRequests",
      count(*) filter (where r.status = 'done')::int as "doneRequests",
      coalesce(avg(greatest(extract(epoch from (r.completed_at - r.created_at)) / 3600, 0)) filter (where r.completed_at is not null), 0)::int as "averageProcessingHours",
      (select count(*)::int from experts where is_available = true) as "activeExperts",
      coalesce((select avg(current_load::float / nullif(max_active_requests, 0) * 100) from experts), 0)::int as "averageExpertLoad",
      count(*) filter (where r.deadline < now() and r.status not in ('done', 'rejected'))::int as "overdueRequests",
      coalesce((select avg(score)::int from assignments), 0) as "averageAssignmentScore"
    from requests r
  `);

  return (
    row ?? {
      totalRequests: 0,
      newRequests: 0,
      inProgressRequests: 0,
      doneRequests: 0,
      averageProcessingHours: 0,
      activeExperts: 0,
      averageExpertLoad: 0,
      overdueRequests: 0,
      averageAssignmentScore: 0
    }
  );
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return withAnalyticsCache(analyticsCacheKeys.dashboardMetrics, loadDashboardMetrics);
}

async function loadExpertDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const [row] = await executeRows<DashboardMetrics>(sql`
    select
      count(r.id)::int as "totalRequests",
      count(*) filter (where r.status = 'new')::int as "newRequests",
      count(*) filter (where r.status in ('assigned', 'in_progress', 'review'))::int as "inProgressRequests",
      count(*) filter (where r.status = 'done')::int as "doneRequests",
      coalesce(avg(greatest(extract(epoch from (r.completed_at - r.created_at)) / 3600, 0)) filter (where r.completed_at is not null), 0)::int as "averageProcessingHours",
      max(case when e.is_available then 1 else 0 end)::int as "activeExperts",
      coalesce(max(e.current_load::float / nullif(e.max_active_requests, 0) * 100), 0)::int as "averageExpertLoad",
      count(*) filter (where r.deadline < now() and r.status not in ('done', 'rejected'))::int as "overdueRequests",
      coalesce((
        select avg(a.score)::int
        from assignments a
        join requests ar on ar.id = a.request_id
        where ar.assigned_expert_id = e.id
      ), 0) as "averageAssignmentScore"
    from experts e
    left join requests r on r.assigned_expert_id = e.id
    where e.user_id = ${userId}
    group by e.id
  `);

  return row ?? {
    totalRequests: 0,
    newRequests: 0,
    inProgressRequests: 0,
    doneRequests: 0,
    averageProcessingHours: 0,
    activeExperts: 0,
    averageExpertLoad: 0,
    overdueRequests: 0,
    averageAssignmentScore: 0
  };
}

export function getDashboardMetricsForUser(user: SessionUser) {
  return user.role === "expert" ? loadExpertDashboardMetrics(user.id) : getDashboardMetrics();
}

function loadRequestTrend(days = 14, expertUserId?: string) {
  const expertScope = expertUserId
    ? sql`and exists (select 1 from experts e where e.id = r.assigned_expert_id and e.user_id = ${expertUserId})`
    : sql``;
  return executeRows<{
    date: string;
    total: number;
    done: number;
  }>(sql`
    with series as (
      select generate_series(current_date - (${days - 1} || ' days')::interval, current_date, '1 day')::date as day
    )
    select
      to_char(series.day, 'DD.MM') as date,
      count(r.id)::int as total,
      count(*) filter (where r.status = 'done')::int as done
    from series
    left join requests r on r.created_at::date = series.day ${expertScope}
    group by series.day
    order by series.day asc
  `);
}

export async function getRequestTrend(days = 14, user?: SessionUser) {
  if (user?.role === "expert") return loadRequestTrend(days, user.id);
  return withAnalyticsCache(analyticsCacheKeys.requestTrend(days), () => loadRequestTrend(days));
}

async function loadAnalyticsBreakdown() {
  const [byStatus, byPriority, expertLoad, topExperts] = await Promise.all([
    executeRows<{ label: string; value: number }>(sql`
      select status as label, count(*)::int as value
      from requests
      group by status
      order by value desc
    `),
    executeRows<{ label: string; value: number }>(sql`
      select priority as label, count(*)::int as value
      from requests
      group by priority
      order by
        case priority when 'urgent' then 4 when 'high' then 3 when 'medium' then 2 else 1 end desc
    `),
    executeRows<{ name: string; load: number; capacity: number; percentage: number }>(sql`
      select
        full_name as name,
        current_load as load,
        max_active_requests as capacity,
        (current_load::float / nullif(max_active_requests, 0) * 100)::int as percentage
      from experts
      order by percentage desc nulls last
      limit 10
    `),
    executeRows<{ name: string; completed: number; rating: string }>(sql`
      select full_name as name, completed_requests_count as completed, rating
      from experts
      order by completed_requests_count desc, rating desc
      limit 8
    `)
  ]);

  return { byStatus, byPriority, expertLoad, topExperts };
}

export async function getAnalyticsBreakdown() {
  return withAnalyticsCache(analyticsCacheKeys.breakdown, loadAnalyticsBreakdown);
}

export async function getDashboardExpertLoad(user: SessionUser) {
  if (user.role !== "expert") {
    const breakdown = await getAnalyticsBreakdown();
    return breakdown.expertLoad;
  }

  return executeRows<{ name: string; load: number; capacity: number; percentage: number }>(sql`
    select
      full_name as name,
      current_load as load,
      max_active_requests as capacity,
      (current_load::float / nullif(max_active_requests, 0) * 100)::int as percentage
    from experts
    where user_id = ${user.id}
    limit 1
  `);
}

export async function getHighPriorityRequests(limit = 6, user?: SessionUser) {
  const expertScope = user?.role === "expert"
    ? sql`and exists (select 1 from experts e where e.id = requests.assigned_expert_id and e.user_id = ${user.id})`
    : sql``;
  return executeRows<{
    id: string;
    publicId: string;
    title: string;
    priority: RequestPriority;
    status: RequestStatus;
    deadline: Date | null;
  }>(sql`
    select
      id,
      public_id as "publicId",
      title,
      priority,
      status,
      deadline
    from requests
    where priority in ('high', 'urgent') and status not in ('done', 'rejected') ${expertScope}
    order by
      case priority when 'urgent' then 2 else 1 end desc,
      deadline asc nulls last
    limit ${limit}
  `);
}
