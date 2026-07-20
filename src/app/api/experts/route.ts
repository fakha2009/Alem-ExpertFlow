import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth/session";
import { assertPermission, canManageExperts } from "@/server/permissions/rbac";
import { createExpert } from "@/server/repositories/expert-repository";
import { expertInputSchema } from "@/server/validators/expert";
import { toErrorResponse } from "@/server/services/http";
import { parseJsonBody } from "@/server/services/request-security";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    assertPermission(canManageExperts(user));
    const input = await parseJsonBody(request, expertInputSchema);
    const expert = await createExpert(input, user);
    return NextResponse.json({ id: expert.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
