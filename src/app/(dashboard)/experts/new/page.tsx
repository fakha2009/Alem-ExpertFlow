import { redirect } from "next/navigation";
import { ExpertForm } from "@/components/forms/expert-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { canManageExperts } from "@/server/permissions/rbac";
import { listSkills } from "@/server/repositories/skill-repository";
import { listAssignableExpertUsers } from "@/server/repositories/user-repository";

export default async function NewExpertPage() {
  const [user, { dictionary: t }] = await Promise.all([requireUser(), getCurrentI18n()]);
  if (!canManageExperts(user)) redirect("/experts");
  const [skills, userOptions] = await Promise.all([listSkills(), listAssignableExpertUsers()]);

  return (
    <>
      <PageHeader title={t.experts.newExpert} description={t.experts.createDescription} />
      <ExpertForm skills={skills} userOptions={userOptions} />
    </>
  );
}
