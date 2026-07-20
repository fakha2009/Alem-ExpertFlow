import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { assertPermission, canManageExperts } from "@/server/permissions/rbac";
import { updateExpert } from "@/server/repositories/expert-repository";
import { expertInputSchema } from "@/server/validators/expert";
import { jsonError, toErrorResponse } from "@/server/services/http";
import { parseJsonBody, uuidParamSchema } from "@/server/services/request-security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { dictionary: t } = await getCurrentI18n();
    const user = await requireApiUser();
    assertPermission(canManageExperts(user));
    const id = uuidParamSchema.parse((await params).id);
    const input = await parseJsonBody(request, expertInputSchema);
    const expert = await updateExpert(id, input, user);
    if (!expert) return jsonError(t.errors.expertNotFound, 404);
    return NextResponse.json({ id: expert.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
