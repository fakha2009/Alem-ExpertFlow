import { SAME_ORIGIN_HEADER, SAME_ORIGIN_HEADER_VALUE } from "@/lib/api-client";

function normalizedOrigin(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isSameOriginMutation(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  if (request.headers.get(SAME_ORIGIN_HEADER) !== SAME_ORIGIN_HEADER_VALUE) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const expectedOrigin = new URL(request.url).origin;
  const origin = normalizedOrigin(request.headers.get("origin"));
  if (origin) return origin === expectedOrigin;

  const referer = normalizedOrigin(request.headers.get("referer"));
  if (referer) return referer === expectedOrigin;

  return request.headers.get("sec-fetch-site") === "same-origin";
}
