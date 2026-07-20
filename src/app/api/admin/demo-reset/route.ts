import { NextResponse } from "next/server";
import { requireApiUser, setSessionCookie } from "@/server/auth/session";
import { assertPermission } from "@/server/permissions/rbac";
import { resetDemoData } from "@/server/services/demo-data";
import { toErrorResponse } from "@/server/services/http";
import { isDemoResetEnabled } from "@/server/config";
import { assertSameOriginMutation } from "@/server/services/request-security";

export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request);
    const user = await requireApiUser();
    assertPermission(user.role === "admin");
    assertPermission(isDemoResetEnabled());

    const { adminUser } = await resetDemoData();
    await setSessionCookie({
      id: adminUser.id,
      email: adminUser.email,
      fullName: adminUser.fullName,
      role: adminUser.role
    }, adminUser.sessionVersion);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
