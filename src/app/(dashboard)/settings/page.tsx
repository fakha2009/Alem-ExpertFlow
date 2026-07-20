import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { ResetDemoDataButton } from "@/components/settings/reset-demo-data-button";
import { requireUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { isDemoResetEnabled } from "@/server/config";

export default async function SettingsPage() {
  const [user, { dictionary: t }] = await Promise.all([requireUser(), getCurrentI18n()]);

  return (
    <>
      <PageHeader title={t.settings.title} description={t.settings.description} />
      <Panel className="max-w-2xl">
        <PanelHeader>
          <PanelTitle>{user.fullName}</PanelTitle>
        </PanelHeader>
        <PanelBody className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border bg-background/70 p-3">
            <div className="text-sm text-muted-foreground">Email</div>
            <div className="mt-1 font-medium">{user.email}</div>
          </div>
          <div className="rounded-md border bg-background/70 p-3">
            <div className="text-sm text-muted-foreground">{t.settings.role}</div>
            <div className="mt-2">
              <Badge className="bg-muted text-foreground">{t.roles.labels[user.role]}</Badge>
            </div>
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:col-span-2">{t.roles.descriptions[user.role]}</p>
        </PanelBody>
      </Panel>
      {user.role === "admin" && isDemoResetEnabled() ? (
        <Panel className="mt-6 max-w-2xl">
          <PanelHeader>
            <PanelTitle>{t.settings.resetTitle}</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-4">
            <p className="text-sm leading-6 text-muted-foreground">{t.settings.resetDescription}</p>
            <ResetDemoDataButton />
          </PanelBody>
        </Panel>
      ) : null}
    </>
  );
}
