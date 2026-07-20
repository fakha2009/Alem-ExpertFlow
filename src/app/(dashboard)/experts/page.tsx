import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/layout/pagination";
import { ButtonLink } from "@/components/ui/button";
import { ExpertFilters } from "@/components/experts/expert-filters";
import { ExpertTable } from "@/components/experts/expert-table";
import { requireUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { canManageExperts, canViewExperts } from "@/server/permissions/rbac";
import { expertListQuerySchema } from "@/server/validators/expert";
import { listExperts } from "@/server/repositories/expert-repository";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpertsPage({ searchParams }: PageProps) {
  const [user, { dictionary: t }] = await Promise.all([requireUser(), getCurrentI18n()]);
  if (!canViewExperts(user)) redirect("/dashboard");
  const rawSearchParams = await searchParams;
  const query = expertListQuerySchema.parse(rawSearchParams);
  const result = await listExperts(query);

  return (
    <>
      <PageHeader
        title={t.experts.title}
        description={t.experts.description}
        actions={
          canManageExperts(user) ? (
            <ButtonLink href="/experts/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.experts.newExpert}
            </ButtonLink>
          ) : null
        }
      />
      <div className="grid gap-4">
        <ExpertFilters />
        <ExpertTable rows={result.rows} />
        <Pagination page={result.page} pageCount={result.pageCount} searchParams={rawSearchParams} labels={t.pagination} />
      </div>
    </>
  );
}
