import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/server/auth/session";
import { assertSameOriginMutation } from "@/server/services/request-security";
import { toErrorResponse } from "@/server/services/http";

export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request);
    await revokeCurrentSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
