import { NextResponse } from "next/server";
import {
  assertPermission,
  canDeleteRequest,
  canMutateRequest
} from "@/server/permissions/rbac";
import { requireApiUser } from "@/server/auth/session";
import { isFinalRequestStatus } from "@/lib/constants";
import { getCurrentI18n } from "@/server/i18n";
import { deleteRequest, getAccessibleRequestSummary, updateRequest, userCanAccessRequest } from "@/server/repositories/request-repository";
import { requestInputSchema } from "@/server/validators/request";
import { jsonError, toErrorResponse } from "@/server/services/http";
import { assertSameOriginMutation, parseJsonBody, uuidParamSchema } from "@/server/services/request-security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { dictionary: t } = await getCurrentI18n();
    const user = await requireApiUser();
    assertPermission(canMutateRequest(user));
    const id = uuidParamSchema.parse((await params).id);
    const current = await getAccessibleRequestSummary(user, id);
    if (!current) return jsonError(t.errors.requestNotFound, 404);
    assertPermission(!isFinalRequestStatus(current.status), t.errors.closedRequest);
    const input = await parseJsonBody(request, requestInputSchema);
    const updated = await updateRequest(id, input, user);
    if (!updated) return jsonError(t.errors.requestNotFound, 404);
    return NextResponse.json({ id: updated.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    assertSameOriginMutation(_request);
    const { dictionary: t } = await getCurrentI18n();
    const user = await requireApiUser();
    assertPermission(canDeleteRequest(user));
    const id = uuidParamSchema.parse((await params).id);
    const allowed = await userCanAccessRequest(user, id);
    if (!allowed) return jsonError(t.errors.requestNotFound, 404);
    const deleted = await deleteRequest(id, user);
    if (!deleted) return jsonError(t.errors.requestNotFound, 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
