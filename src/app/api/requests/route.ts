import { NextResponse } from "next/server";
import { canCreateRequest, assertPermission } from "@/server/permissions/rbac";
import { requireApiUser } from "@/server/auth/session";
import { createRequest } from "@/server/repositories/request-repository";
import { requestInputSchema } from "@/server/validators/request";
import { toErrorResponse } from "@/server/services/http";
import { parseJsonBody } from "@/server/services/request-security";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    assertPermission(canCreateRequest(user));
    const input = await parseJsonBody(request, requestInputSchema);
    const created = await createRequest(input, user);
    return NextResponse.json({ id: created.id, publicId: created.publicId }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
