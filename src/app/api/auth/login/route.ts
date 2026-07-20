import { NextResponse } from "next/server";
import { checkLoginRateLimit, getClientAddress, resetLoginRateLimit } from "@/server/auth/rate-limit";
import { setSessionCookie } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";
import { getCurrentI18n } from "@/server/i18n";
import { findUserByEmail } from "@/server/repositories/user-repository";
import { loginSchema } from "@/server/validators/auth";
import { jsonError, toErrorResponse } from "@/server/services/http";
import { parseJsonBody } from "@/server/services/request-security";

const DUMMY_PASSWORD_HASH = "$2b$12$2y2phJapntMRqesfFVJMuusIVBXJLoOP5l1VzNgGQdQKd3Hu0vVvC";

export async function POST(request: Request) {
  try {
    const { dictionary: t } = await getCurrentI18n();
    const payload = await parseJsonBody(request, loginSchema, 2 * 1024);
    const limit = await checkLoginRateLimit(payload.email, getClientAddress(request));

    if (!limit.allowed) {
      return jsonError(t.auth.tooManyAttempts, 429);
    }

    const user = await findUserByEmail(payload.email);
    const valid = await verifyPassword(payload.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !user.isActive || !valid) {
      return jsonError(t.auth.invalidCredentials, 401);
    }

    await resetLoginRateLimit(payload.email);
    await setSessionCookie({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    }, user.sessionVersion);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
