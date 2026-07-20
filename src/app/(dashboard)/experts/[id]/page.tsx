import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Edit } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { interpolate } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { canManageExperts, canViewExperts } from "@/server/permissions/rbac";
import { getExpertDetail } from "@/server/repositories/expert-repository";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExpertDetailPage({ params }: PageProps) {
  const [user, { locale, dictionary: t }] = await Promise.all([requireUser(), getCurrentI18n()]);
  if (!canViewExperts(user)) redirect("/dashboard");
  const { id } = await params;
  const expert = await getExpertDetail(id);
  if (!expert) notFound();
  const loadPercent = (expert.currentLoad / expert.maxActiveRequests) * 100;

  return (
    <>
      <PageHeader
        title={expert.fullName}
        description={`${t.labels.expertTypes[expert.type]} · ${t.experts.rating} ${Number(expert.rating).toFixed(1)} · ${t.experts.completed} ${expert.completedRequestsCount}`}
        actions={
          canManageExperts(user) ? (
            <ButtonLink href={`/experts/${expert.id}/edit`} variant="secondary">
              <Edit className="h-4 w-4" aria-hidden="true" />
              {t.common.edit}
            </ButtonLink>
          ) : null
        }
      />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t.experts.profile}</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge className={expert.isAvailable
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}>
                {expert.isAvailable ? t.experts.available : t.experts.unavailable}
              </Badge>
              {loadPercent >= 100 ? (
                <Badge className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                  {t.experts.overloaded}
                </Badge>
              ) : null}
              <Badge className="bg-muted text-muted-foreground">
                {interpolate(t.experts.responseWithin, { hours: expert.responseTimeHours })}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{expert.bio}</p>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{t.experts.load}</span>
                <span className="text-muted-foreground">
                  {expert.currentLoad}/{expert.maxActiveRequests}
                </span>
              </div>
              <Progress value={loadPercent} tone={loadPercent >= 100 ? "danger" : loadPercent >= 80 ? "warning" : "default"} />
            </div>
            <div>
              <h2 className="mb-3 text-sm font-semibold">{t.experts.skills}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {expert.skills.map((skill) => (
                  <div key={skill.skillId} className="rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{skill.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{skill.category}</div>
                      </div>
                      <Badge className="bg-muted text-muted-foreground">L{skill.level}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {interpolate(t.experts.yearsExperience, { years: skill.yearsExperience })}
                      {skill.verified ? ` · ${t.experts.verified}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PanelBody>
        </Panel>

        <aside className="grid gap-6 self-start">
          <Panel>
            <PanelHeader>
              <PanelTitle>{t.experts.assignments}</PanelTitle>
            </PanelHeader>
            <PanelBody className="grid gap-3">
              {expert.assignments.length === 0 ? (
                <EmptyState title={t.requests.emptyTitle} text={t.requests.emptyText} />
              ) : null}
              {expert.assignments.map((request) => (
                <Link key={request.requestId} href={`/requests/${request.requestId}`} className="rounded-md border p-3 transition hover:bg-muted/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{request.publicId}</div>
                    <PriorityBadge priority={request.priority} label={t.labels.priorities[request.priority]} />
                  </div>
                  <div className="mt-2 text-sm text-foreground">{request.title}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <StatusBadge status={request.status} label={t.labels.statuses[request.status]} />
                    <span className="text-xs text-muted-foreground">{formatDate(request.deadline, locale, t.common.notSet)}</span>
                  </div>
                </Link>
              ))}
            </PanelBody>
          </Panel>
        </aside>
      </section>
    </>
  );
}
