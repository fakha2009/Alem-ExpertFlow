import { NextResponse } from "next/server";
import { z } from "zod";
import { REQUEST_STATUSES } from "@/lib/constants";
import { requireApiUser } from "@/server/auth/session";
import { getCurrentI18n } from "@/server/i18n";
import { assertPermission, canChangeStatus } from "@/server/permissions/rbac";
import { changeRequestStatus, getAccessibleRequestSummary } from "@/server/repositories/request-repository";
import { jsonError, toErrorResponse } from "@/server/services/http";
import { parseJsonBody, uuidParamSchema } from "@/server/services/request-security";

const statusSchema = z.object({
  status: z.enum(REQUEST_STATUSES)
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { dictionary: t } = await getCurrentI18n();
    const user = await requireApiUser();
    const id = uuidParamSchema.parse((await params).id);
    const input = await parseJsonBody(request, statusSchema, 2 * 1024);
    const current = await getAccessibleRequestSummary(user, id);
    if (!current) return jsonError(t.errors.requestNotFound, 404);
    assertPermission(canChangeStatus(user, current.status, input.status));
    const updated = await changeRequestStatus(id, current.status, input.status, user);
    if (!updated) return jsonError(t.errors.requestNotFound, 404);
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    return toErrorResponse(error);
  }
}
