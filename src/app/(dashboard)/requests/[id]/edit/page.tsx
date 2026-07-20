import { notFound, redirect } from "next/navigation";
import { RequestForm } from "@/components/forms/request-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { canMutateRequest } from "@/server/permissions/rbac";
import { isFinalRequestStatus } from "@/lib/constants";
import { getRequestDetail } from "@/server/repositories/request-repository";
import { listSkills } from "@/server/repositories/skill-repository";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRequestPage({ params }: PageProps) {
  const [user, { dictionary: t }] = await Promise.all([requireUser(), getCurrentI18n()]);
  if (!canMutateRequest(user)) redirect("/requests");

  const { id } = await params;
  const [request, skills] = await Promise.all([
    getRequestDetail(id, user),
    listSkills()
  ]);

  if (!request) notFound();
  if (isFinalRequestStatus(request.status)) redirect(`/requests/${request.id}`);

  return (
    <>
      <PageHeader title={t.requests.editRequest} description={`${request.publicId}: ${request.title}`} />
      <RequestForm
        skills={skills}
        initial={{
          id: request.id,
          title: request.title,
          description: request.description,
          category: request.category,
          priority: request.priority,
          deadline: request.deadline ? new Date(request.deadline).toISOString().slice(0, 16) : "",
          skills: request.skills.map((skill) => ({
            skillId: skill.skillId,
            importance: skill.importance
          }))
        }}
      />
    </>
  );
}
