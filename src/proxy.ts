import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { isUserRole, SESSION_COOKIE, type UserRole } from "@/lib/constants";

const protectedPrefixes = ["/dashboard", "/requests", "/experts", "/skills", "/analytics", "/activity", "/settings"];

const roleGuards: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/experts", roles: ["admin", "manager", "viewer"] },
  { prefix: "/skills", roles: ["admin", "manager"] },
  { prefix: "/analytics", roles: ["admin", "manager", "viewer"] },
  { prefix: "/activity", roles: ["admin", "manager"] }
];

function pathMatchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""};
    style-src 'self' 'nonce-${nonce}';
    style-src-attr 'none';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self'${isDevelopment ? " ws: http: https:" : ""};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isDevelopment ? "" : "upgrade-insecure-requests;"}
  `.replace(/\s{2,}/g, " ").trim();
}

function secureResponse(response: NextResponse, contentSecurityPolicy: string) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

async function readRole(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
      issuer: "alem-expertflow",
      audience: "alem-expertflow-web"
    });
    return isUserRole(payload.role) ? payload.role : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = getContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  const isProtected = protectedPrefixes.some((prefix) => pathMatchesPrefix(pathname, prefix));

  if (!isProtected) {
    return secureResponse(NextResponse.next({ request: { headers: requestHeaders } }), contentSecurityPolicy);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return secureResponse(NextResponse.redirect(url), contentSecurityPolicy);
  }

  const role = await readRole(token);
  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return secureResponse(NextResponse.redirect(url), contentSecurityPolicy);
  }

  const guard = roleGuards.find((item) => pathMatchesPrefix(pathname, item.prefix));
  if (guard && !guard.roles.includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return secureResponse(NextResponse.redirect(url), contentSecurityPolicy);
  }

  return secureResponse(NextResponse.next({ request: { headers: requestHeaders } }), contentSecurityPolicy);
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" }
      ]
    }
  ]
};
