import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth/session";
import { assertPermission, canManageSkills } from "@/server/permissions/rbac";
import { createActivity } from "@/server/repositories/activity-repository";
import { createSkill } from "@/server/repositories/skill-repository";
import { skillInputSchema } from "@/server/validators/skill";
import { toErrorResponse } from "@/server/services/http";
import { parseJsonBody } from "@/server/services/request-security";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    assertPermission(canManageSkills(user));
    const input = await parseJsonBody(request, skillInputSchema, 8 * 1024);
    const skill = await createSkill(input);
    await createActivity({
      actorId: user.id,
      action: "skill.created",
      entityType: "skill",
      entityId: skill.id,
      metadata: { name: skill.name, category: skill.category }
    });
    return NextResponse.json({ id: skill.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
