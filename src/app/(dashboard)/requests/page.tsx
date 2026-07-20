import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/layout/pagination";
import { RequestFilters } from "@/components/requests/request-filters";
import { RequestTable } from "@/components/requests/request-table";
import { getCurrentI18n } from "@/server/i18n";
import { listRequestCategories, listRequests } from "@/server/repositories/request-repository";
import { requestListQuerySchema } from "@/server/validators/request";
import { requireUser } from "@/server/auth/session";
import { canCreateRequest } from "@/server/permissions/rbac";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RequestsPage({ searchParams }: PageProps) {
  const [user, { dictionary: t }] = await Promise.all([requireUser(), getCurrentI18n()]);
  const rawSearchParams = await searchParams;
  const query = requestListQuerySchema.parse(rawSearchParams);
  const [result, categories] = await Promise.all([listRequests(user, query), listRequestCategories(user)]);

  return (
    <>
      <PageHeader
        title={t.requests.title}
        description={t.requests.description}
        actions={
          canCreateRequest(user) ? (
            <ButtonLink href="/requests/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.requests.newRequest}
            </ButtonLink>
          ) : null
        }
      />
      <div className="grid gap-4">
        <RequestFilters categories={categories} />
        <RequestTable rows={result.rows} />
        <Pagination page={result.page} pageCount={result.pageCount} searchParams={rawSearchParams} labels={t.pagination} />
      </div>
    </>
  );
}
