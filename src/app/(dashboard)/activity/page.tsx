import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";
import { Panel, PanelBody } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { getActivityActionLabel } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { getCurrentI18n } from "@/server/i18n";
import { listActivity } from "@/server/repositories/activity-repository";
import { requireUser } from "@/server/auth/session";
import { canViewActivity } from "@/server/permissions/rbac";

export default async function ActivityPage() {
  const user = await requireUser();
  if (!canViewActivity(user)) redirect("/dashboard");
  const [{ locale, dictionary: t }, activity] = await Promise.all([getCurrentI18n(), listActivity(80)]);

  return (
    <>
      <PageHeader title={t.activity.title} description={t.activity.description} />
      <Panel>
        <PanelBody className="p-0">
          <div className="divide-y">
            {activity.length === 0 ? <div className="p-5"><EmptyState title={t.dataTable.emptyTitle} text={t.dataTable.emptyText} /></div> : null}
            {activity.map((item) => (
              <div key={item.id} className="grid gap-2 px-5 py-4 transition-colors hover:bg-muted/35 md:grid-cols-[180px_1fr_220px]">
                <div className="text-sm font-medium text-foreground">{getActivityActionLabel(t, item.action)}</div>
                <div className="text-sm text-muted-foreground">
                  {item.entityType}
                  {item.entityId ? ` · ${item.entityId}` : ""}
                </div>
                <div className="text-sm text-muted-foreground md:text-right">
                  {item.actorName ?? t.common.system} · {formatDateTime(item.createdAt, locale, t.common.notSet)}
                </div>
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>
    </>
  );
}
