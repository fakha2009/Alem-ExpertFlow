import { NextResponse } from "next/server";
import { z } from "zod";
import { isFinalRequestStatus } from "@/lib/constants";
import { requireApiUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { assertPermission, canAssignExpert } from "@/server/permissions/rbac";
import { assignExpertToRequest, getAccessibleRequestSummary } from "@/server/repositories/request-repository";
import { getMatchingRecommendations } from "@/server/services/matching-service";
import { jsonError, toErrorResponse } from "@/server/services/http";
import { parseJsonBody, uuidParamSchema } from "@/server/services/request-security";

const assignSchema = z.object({
  expertId: z.string().uuid()
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { dictionary: t } = await getCurrentI18n();
    const user = await requireApiUser();
    assertPermission(canAssignExpert(user));
    const id = uuidParamSchema.parse((await params).id);
    const input = await parseJsonBody(request, assignSchema, 2 * 1024);
    const current = await getAccessibleRequestSummary(user, id);
    if (!current) return jsonError(t.errors.requestNotFound, 404);
    if (isFinalRequestStatus(current.status)) return jsonError(t.errors.closedRequest, 409);
    const recommendation = (await getMatchingRecommendations(id, t.matching.explanation))
      .find((item) => item.expertId === input.expertId);
    if (!recommendation) return jsonError(t.matching.notEligible, 409);
    const updated = await assignExpertToRequest({
      requestId: id,
      expertId: input.expertId,
      score: recommendation.finalScore,
      explanation: recommendation.explanation,
      actor: user
    });
    if (!updated) return jsonError(t.matching.notEligible, 409);
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    return toErrorResponse(error);
  }
}
