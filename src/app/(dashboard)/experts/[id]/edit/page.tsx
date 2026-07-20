import { notFound, redirect } from "next/navigation";
import { ExpertForm } from "@/components/forms/expert-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { canManageExperts } from "@/server/permissions/rbac";
import { getExpertDetail } from "@/server/repositories/expert-repository";
import { listSkills } from "@/server/repositories/skill-repository";
import { listAssignableExpertUsers } from "@/server/repositories/user-repository";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditExpertPage({ params }: PageProps) {
  const [user, { dictionary: t }] = await Promise.all([requireUser(), getCurrentI18n()]);
  if (!canManageExperts(user)) redirect("/experts");
  const { id } = await params;
  const [expert, skills, userOptions] = await Promise.all([
    getExpertDetail(id),
    listSkills(),
    listAssignableExpertUsers(id)
  ]);
  if (!expert) notFound();

  return (
    <>
      <PageHeader title={t.experts.editExpert} description={expert.fullName} />
      <ExpertForm
        skills={skills}
        userOptions={userOptions}
        initial={{
          id: expert.id,
          fullName: expert.fullName,
          userId: expert.userId ?? "",
          type: expert.type,
          bio: expert.bio,
          currentLoad: expert.currentLoad,
          maxActiveRequests: expert.maxActiveRequests,
          rating: Number(expert.rating),
          isAvailable: expert.isAvailable,
          responseTimeHours: expert.responseTimeHours,
          completedRequestsCount: expert.completedRequestsCount,
          skills: expert.skills.map((skill) => ({
            skillId: skill.skillId,
            level: skill.level,
            yearsExperience: skill.yearsExperience,
            verified: skill.verified
          }))
        }}
      />
    </>
  );
}
