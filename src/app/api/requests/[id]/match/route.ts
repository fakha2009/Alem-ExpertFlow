import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { assertPermission, canAssignExpert } from "@/server/permissions/rbac";
import { requestExists } from "@/server/repositories/request-repository";
import { getMatchingRecommendations } from "@/server/services/matching-service";
import { jsonError, toErrorResponse } from "@/server/services/http";
import { uuidParamSchema } from "@/server/services/request-security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireApiUser();
    assertPermission(canAssignExpert(user));
    const { dictionary: t } = await getCurrentI18n();
    const id = uuidParamSchema.parse((await params).id);
    if (!(await requestExists(id))) return jsonError(t.errors.requestNotFound, 404);
    const recommendations = await getMatchingRecommendations(id, t.matching.explanation);
    return NextResponse.json({ recommendations });
  } catch (error) {
    return toErrorResponse(error);
  }
}
