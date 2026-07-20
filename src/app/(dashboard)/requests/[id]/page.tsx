import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { PageHeader } from "@/components/layout/page-header";
import { CommentForm } from "@/components/requests/comment-form";
import { MatchPanel } from "@/components/requests/match-panel";
import { StatusActions } from "@/components/requests/status-actions";
import { getActivityActionLabel } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { canAssignExpert, canComment, canMutateRequest } from "@/server/permissions/rbac";
import { getAllowedStatusTransitions } from "@/server/permissions/rbac";
import { isFinalRequestStatus } from "@/lib/constants";
import { getRequestDetail } from "@/server/repositories/request-repository";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RequestDetailPage({ params }: PageProps) {
  const [user, { locale, dictionary: t }] = await Promise.all([requireUser(), getCurrentI18n()]);
  const { id } = await params;
  const request = await getRequestDetail(id, user);
  if (!request) notFound();
  const closed = isFinalRequestStatus(request.status);
  const allowedStatuses = getAllowedStatusTransitions(user, request.status);

  return (
    <>
      <PageHeader
        title={request.title}
        description={`${request.publicId} · ${t.common.created} ${request.createdByName} · ${formatDateTime(request.createdAt, locale, t.common.notSet)}`}
        actions={
          canMutateRequest(user) && !closed ? (
            <ButtonLink href={`/requests/${request.id}/edit`} variant="secondary">
              <Edit className="h-4 w-4" aria-hidden="true" />
              {t.common.edit}
            </ButtonLink>
          ) : null
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          <Panel>
            <PanelHeader>
              <PanelTitle>{t.requests.detailsTitle}</PanelTitle>
            </PanelHeader>
            <PanelBody className="grid gap-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={request.status} label={t.labels.statuses[request.status]} />
                <PriorityBadge priority={request.priority} label={t.labels.priorities[request.priority]} />
                <Badge className="bg-surface-elevated text-muted-foreground">
                  {t.requests.deadlineField}: {formatDate(request.deadline, locale, t.common.notSet)}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{request.description}</p>
              <div>
                <h3 className="mb-2 text-sm font-semibold">{t.requests.requiredSkills}</h3>
                <div className="flex flex-wrap gap-2">
                  {request.skills.map((skill) => (
                    <Badge key={skill.skillId} className="bg-muted text-foreground">
                      {skill.name} · {t.labels.importance[skill.importance]}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">{t.requests.status}</h3>
                <StatusActions
                  requestId={request.id}
                  allowedStatuses={allowedStatuses}
                />
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <MatchPanel requestId={request.id} canAssign={canAssignExpert(user) && !closed} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>{t.requests.comments}</PanelTitle>
            </PanelHeader>
            <PanelBody className="grid gap-4">
              {request.comments.length === 0 ? <p className="text-sm text-muted-foreground">{t.requests.commentsEmpty}</p> : null}
              {request.comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{comment.authorName}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt, locale, t.common.notSet)}</div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.body}</p>
                </div>
              ))}
              <CommentForm requestId={request.id} allowed={canComment(user)} />
            </PanelBody>
          </Panel>
        </div>

        <aside className="grid gap-6 self-start">
          <Panel>
            <PanelHeader>
              <PanelTitle>{t.requests.assignee}</PanelTitle>
            </PanelHeader>
            <PanelBody>
              {request.assignedExpertId ? (
                <Link href={`/experts/${request.assignedExpertId}`} className="text-sm font-semibold text-primary hover:underline">
                  {request.assignedExpertName}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">{t.requests.noAssignee}</p>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>{t.requests.assignments}</PanelTitle>
            </PanelHeader>
            <PanelBody className="grid gap-3">
              {request.assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.requests.assignmentsEmpty}</p>
              ) : (
                request.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{assignment.expertName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(assignment.createdAt, locale, t.common.notSet)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{assignment.score}</div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{assignment.explanation}</p>
                  </div>
                ))
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>{t.requests.activityHistory}</PanelTitle>
            </PanelHeader>
            <PanelBody className="grid gap-3">
              {request.activity.map((item) => (
                <div key={item.id} className="border-l-2 border-primary/30 pl-3">
                  <div className="text-sm font-medium">{getActivityActionLabel(t, item.action)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.actorName ?? t.common.system} · {formatDateTime(item.createdAt, locale, t.common.notSet)}
                  </div>
                </div>
              ))}
              {request.activity.length === 0 ? <p className="text-sm text-muted-foreground">{t.requests.activityEmpty}</p> : null}
            </PanelBody>
          </Panel>
        </aside>
      </section>
    </>
  );
}
