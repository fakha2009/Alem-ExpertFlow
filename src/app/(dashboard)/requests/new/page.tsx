import { redirect } from "next/navigation";
import { RequestForm } from "@/components/forms/request-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { canCreateRequest } from "@/server/permissions/rbac";
import { listSkills } from "@/server/repositories/skill-repository";

export default async function NewRequestPage() {
  const [user, { dictionary: t }] = await Promise.all([requireUser(), getCurrentI18n()]);
  if (!canCreateRequest(user)) redirect("/requests");

  const skills = await listSkills();

  return (
    <>
      <PageHeader title={t.requests.newRequest} description={t.requests.createDescription} />
      <RequestForm skills={skills} />
    </>
  );
}
