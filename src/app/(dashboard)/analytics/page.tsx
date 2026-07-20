import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { SimpleBarChart } from "@/components/dashboard/simple-chart";
import type { RequestPriority, RequestStatus } from "@/lib/constants";
import { getCurrentI18n } from "@/server/i18n";
import { getAnalyticsBreakdown, getDashboardMetrics } from "@/server/repositories/analytics-repository";
import { requireUser } from "@/server/auth/session";
import { canViewAnalytics } from "@/server/permissions/rbac";

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-surface p-4 shadow-card transition-colors hover:border-ring/35">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold leading-none text-foreground">{value}</div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  if (!canViewAnalytics(user)) redirect("/dashboard");
  const [{ dictionary: t }, metrics, breakdown] = await Promise.all([
    getCurrentI18n(),
    getDashboardMetrics(),
    getAnalyticsBreakdown()
  ]);

  return (
    <>
      <PageHeader title={t.analytics.title} description={t.analytics.description} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t.analytics.averageProcessingTime} value={`${metrics.averageProcessingHours} ${t.common.hoursShort}`} />
        <MetricCard label={t.analytics.averageAssignmentScore} value={metrics.averageAssignmentScore} />
        <MetricCard label={t.analytics.activeExperts} value={metrics.activeExperts} />
        <MetricCard label={t.analytics.overdueRequests} value={metrics.overdueRequests} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t.analytics.byStatus}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            {breakdown.byStatus.length > 0 ? <SimpleBarChart
              data={breakdown.byStatus.map((item) => ({
                label: t.labels.statuses[item.label as RequestStatus] ?? item.label,
                value: item.value
              }))}
            /> : <EmptyState title={t.dataTable.emptyTitle} text={t.dataTable.emptyText} />}
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t.analytics.byPriority}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            {breakdown.byPriority.length > 0 ? <SimpleBarChart
              data={breakdown.byPriority.map((item) => ({
                label: t.labels.priorities[item.label as RequestPriority] ?? item.label,
                value: item.value
              }))}
            /> : <EmptyState title={t.dataTable.emptyTitle} text={t.dataTable.emptyText} />}
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t.analytics.expertLoad}</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-4">
            {breakdown.expertLoad.length === 0 ? <EmptyState title={t.dataTable.emptyTitle} text={t.dataTable.emptyText} /> : null}
            {breakdown.expertLoad.map((expert) => (
              <div key={expert.name}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{expert.name}</span>
                  <span className="text-muted-foreground">
                    {expert.load}/{expert.capacity}
                  </span>
                </div>
                <Progress value={expert.percentage} />
              </div>
            ))}
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t.analytics.topExperts}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            {breakdown.topExperts.length > 0 ? <SimpleBarChart
              data={breakdown.topExperts.map((expert) => ({
                label: expert.name,
                value: expert.completed
              }))}
            /> : <EmptyState title={t.dataTable.emptyTitle} text={t.dataTable.emptyText} />}
          </PanelBody>
        </Panel>
      </section>
    </>
  );
}
