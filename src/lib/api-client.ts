export const SAME_ORIGIN_HEADER = "X-Alem-Request";
export const SAME_ORIGIN_HEADER_VALUE = "same-origin";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (!SAFE_METHODS.has(method)) {
    headers.set(SAME_ORIGIN_HEADER, SAME_ORIGIN_HEADER_VALUE);
  }

  return fetch(input, { ...init, headers });
}
