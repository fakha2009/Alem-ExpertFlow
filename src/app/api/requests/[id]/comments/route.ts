import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { assertPermission, canComment } from "@/server/permissions/rbac";
import { addRequestComment, userCanAccessRequest } from "@/server/repositories/request-repository";
import { commentInputSchema } from "@/server/validators/comment";
import { jsonError, toErrorResponse } from "@/server/services/http";
import { parseJsonBody, uuidParamSchema } from "@/server/services/request-security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { dictionary: t } = await getCurrentI18n();
    const user = await requireApiUser();
    assertPermission(canComment(user));
    const id = uuidParamSchema.parse((await params).id);
    const allowed = await userCanAccessRequest(user, id);
    if (!allowed) return jsonError(t.errors.requestNotFound, 404);
    const input = await parseJsonBody(request, commentInputSchema, 8 * 1024);
    const created = await addRequestComment(id, input.body, user);
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
