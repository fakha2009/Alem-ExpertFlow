import Link from "next/link";
import { AlertTriangle, Clock3, Gauge, ListChecks, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { SimpleBarChart, TrendChart } from "@/components/dashboard/simple-chart";
import { getActivityActionLabel } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getCurrentI18n } from "@/server/i18n";
import { getDashboardExpertLoad, getDashboardMetricsForUser, getHighPriorityRequests, getRequestTrend } from "@/server/repositories/analytics-repository";
import { listActivity } from "@/server/repositories/activity-repository";
import { requireUser } from "@/server/auth/session";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default"
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof ListChecks;
  tone?: "default" | "danger";
}) {
  return (
    <div className={cn(
      "rounded-lg border bg-surface p-4 shadow-card transition-colors hover:border-ring/35",
      tone === "danger" && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-semibold leading-none text-foreground">{value}</div>
        </div>
        <span className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md border bg-primary/10 text-primary",
          tone === "danger" && "border-red-200 bg-red-100 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        )}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [{ locale, dictionary: t }, metrics, trend, expertLoad, highPriority, activity] = await Promise.all([
    getCurrentI18n(),
    getDashboardMetricsForUser(user),
    getRequestTrend(14, user),
    getDashboardExpertLoad(user),
    getHighPriorityRequests(6, user),
    listActivity(8, user)
  ]);

  return (
    <>
      <PageHeader title={t.dashboard.title} description={t.dashboard.description} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t.dashboard.totalRequests}
          value={metrics.totalRequests}
          helper={`${metrics.newRequests} ${t.dashboard.newRequests}`}
          icon={ListChecks}
        />
        <KpiCard
          label={t.dashboard.inProgress}
          value={metrics.inProgressRequests}
          helper={`${metrics.doneRequests} ${t.common.completed}`}
          icon={Gauge}
        />
        <KpiCard
          label={t.dashboard.averageTime}
          value={`${metrics.averageProcessingHours} ${t.common.hoursShort}`}
          helper={t.dashboard.closedRequests}
          icon={Clock3}
        />
        <KpiCard
          label={t.dashboard.overdue}
          value={metrics.overdueRequests}
          helper={`${metrics.activeExperts} ${t.dashboard.activeExperts}`}
          icon={AlertTriangle}
          tone={metrics.overdueRequests > 0 ? "danger" : "default"}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t.dashboard.trendTitle}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <TrendChart data={trend} labels={t.charts} />
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" /> {t.dashboard.created}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t.dashboard.completed}
              </span>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>{t.dashboard.expertLoad}</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.dashboard.averageLoad}</span>
                <span className="font-semibold">{metrics.averageExpertLoad}%</span>
              </div>
              <Progress value={metrics.averageExpertLoad} />
            </div>
            {expertLoad.length > 0 ? (
              <SimpleBarChart
                data={expertLoad.slice(0, 5).map((item) => ({
                  label: item.name,
                  value: item.percentage
                }))}
              />
            ) : <EmptyState title={t.dataTable.emptyTitle} text={t.dataTable.emptyText} />}
          </PanelBody>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.9fr)]">
        <Panel>
          <PanelHeader className="flex items-center justify-between gap-4">
            <PanelTitle>{t.dashboard.highPriority}</PanelTitle>
            <Link href="/requests?priority=high" className="text-sm font-medium text-primary hover:underline">
              {t.dashboard.allRequests}
            </Link>
          </PanelHeader>
          <PanelBody className="p-0">
            {highPriority.length === 0 ? (
              <div className="p-5"><EmptyState title={t.requests.emptyTitle} text={t.requests.emptyText} /></div>
            ) : <div className="divide-y">
              {highPriority.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="grid gap-3 px-5 py-4 transition hover:bg-muted/50 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{request.publicId}</span>
                      <PriorityBadge priority={request.priority} label={t.labels.priorities[request.priority]} />
                      <StatusBadge status={request.status} label={t.labels.statuses[request.status]} />
                    </div>
                    <div className="mt-2 truncate text-sm text-foreground">{request.title}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t.dashboard.deadline}: {formatDate(request.deadline, locale, t.common.notSet)}
                  </div>
                </Link>
              ))}
            </div>}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader className="flex items-center justify-between gap-4">
            <PanelTitle>{t.dashboard.recentActivity}</PanelTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </PanelHeader>
          <PanelBody className="grid gap-4">
            {activity.length === 0 ? <EmptyState title={t.dataTable.emptyTitle} text={t.dataTable.emptyText} /> : null}
            {activity.map((item) => (
              <div key={item.id} className="grid gap-1 border-l-2 border-primary/30 pl-3">
                <div className="text-sm font-medium text-foreground">{getActivityActionLabel(t, item.action)}</div>
                <div className="text-xs text-muted-foreground">
                  {item.actorName ?? t.common.system} · {formatDateTime(item.createdAt, locale, t.common.notSet)}
                </div>
              </div>
            ))}
          </PanelBody>
        </Panel>
      </section>
    </>
  );
}
