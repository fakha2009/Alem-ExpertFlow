import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { isUserRole, SESSION_COOKIE } from "@/lib/constants";
import type { SessionUser } from "@/server/permissions/rbac";
import { findUserById, revokeUserSessions } from "@/server/repositories/user-repository";

const encoder = new TextEncoder();
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SESSION_ISSUER = "alem-expertflow";
const SESSION_AUDIENCE = "alem-expertflow-web";

type SessionClaims = SessionUser & {
  sessionVersion: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  }
  return encoder.encode(secret);
}

export async function createSessionToken(user: SessionClaims) {
  return new SignJWT({
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    sessionVersion: user.sessionVersion
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE
    });
    if (
      !payload.sub
      || typeof payload.email !== "string"
      || typeof payload.fullName !== "string"
      || !isUserRole(payload.role)
      || typeof payload.sessionVersion !== "number"
      || !Number.isSafeInteger(payload.sessionVersion)
      || payload.sessionVersion < 0
    ) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
      sessionVersion: payload.sessionVersion
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser, sessionVersion: number) {
  if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 0) {
    throw new Error("Invalid session version.");
  }

  const token = await createSessionToken({ ...user, sessionVersion });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    priority: "high"
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const user = await findUserById(claims.id);
  if (!user || !user.isActive || user.sessionVersion !== claims.sessionVersion) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role
  } satisfies SessionUser;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySessionToken(token) : null;

  if (claims) {
    await revokeUserSessions(claims.id, claims.sessionVersion);
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireApiUser() {
  const user = await getSessionUser();
  if (!user) {
    const error = new Error("Не авторизован");
    error.name = "UnauthorizedError";
    throw error;
  }
  return user;
}
