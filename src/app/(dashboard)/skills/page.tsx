import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";
import { SkillForm } from "@/components/forms/skill-form";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentI18n } from "@/server/i18n";
import { listSkills } from "@/server/repositories/skill-repository";
import { requireUser } from "@/server/auth/session";
import { canManageSkills } from "@/server/permissions/rbac";

export default async function SkillsPage() {
  const user = await requireUser();
  if (!canManageSkills(user)) redirect("/dashboard");
  const [{ dictionary: t }, skills] = await Promise.all([getCurrentI18n(), listSkills()]);
  const grouped = skills.reduce<Map<string, typeof skills>>((map, skill) => {
    const items = map.get(skill.category) ?? [];
    items.push(skill);
    map.set(skill.category, items);
    return map;
  }, new Map());

  return (
    <>
      <PageHeader title={t.skills.title} description={t.skills.description} />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t.skills.directory}</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-5">
            {grouped.size === 0 ? <EmptyState title={t.dataTable.emptyTitle} text={t.dataTable.emptyText} /> : null}
            {Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <h2 className="mb-3 text-sm font-semibold text-foreground">{category}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((skill) => (
                    <div key={skill.id} className="rounded-lg border bg-background/70 p-4 transition-colors hover:border-ring/35 hover:bg-background">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{skill.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{skill.slug}</div>
                        </div>
                        <Badge className="bg-muted text-muted-foreground">{category}</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{skill.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </PanelBody>
        </Panel>
        <Panel className="self-start lg:sticky lg:top-20">
          <PanelHeader>
            <PanelTitle>{t.skills.newSkill}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <SkillForm />
          </PanelBody>
        </Panel>
      </section>
    </>
  );
}
