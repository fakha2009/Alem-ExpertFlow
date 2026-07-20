import "server-only";

import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { executeRows } from "@/server/db/query";

const WINDOW_SECONDS = 15 * 60;
const MAX_ACCOUNT_ATTEMPTS = 8;
const MAX_IP_ATTEMPTS = 50;

function rateLimitKey(scope: "account" | "ip", identifier: string) {
  return createHash("sha256")
    .update(`${scope}:${identifier.toLowerCase().trim()}`)
    .digest("hex");
}

async function consume(key: string, maximum: number) {
  const [row] = await executeRows<{ count: number; resetAt: Date }>(sql`
    with cleanup as (
      delete from auth_rate_limits
      where reset_at < now() - interval '1 day'
    )
    insert into auth_rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${WINDOW_SECONDS}))
    on conflict (key) do update
    set
      count = case
        when auth_rate_limits.reset_at <= now() then 1
        else auth_rate_limits.count + 1
      end,
      reset_at = case
        when auth_rate_limits.reset_at <= now() then now() + make_interval(secs => ${WINDOW_SECONDS})
        else auth_rate_limits.reset_at
      end
    returning count, reset_at as "resetAt"
  `);

  const count = row?.count ?? maximum + 1;
  return {
    allowed: count <= maximum,
    remaining: Math.max(maximum - count, 0),
    resetAt: row?.resetAt ?? new Date(Date.now() + WINDOW_SECONDS * 1000)
  };
}

export function getClientAddress(request: Request) {
  if (!process.env.VERCEL) return "local";
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  return forwarded.split(",")[0].trim().slice(0, 128) || "unknown";
}

export async function checkLoginRateLimit(email: string, clientAddress: string) {
  const [account, ip] = await Promise.all([
    consume(rateLimitKey("account", email), MAX_ACCOUNT_ATTEMPTS),
    consume(rateLimitKey("ip", clientAddress), MAX_IP_ATTEMPTS)
  ]);

  return {
    allowed: account.allowed && ip.allowed,
    remaining: Math.min(account.remaining, ip.remaining),
    resetAt: account.resetAt > ip.resetAt ? account.resetAt : ip.resetAt
  };
}

export async function resetLoginRateLimit(email: string) {
  const key = rateLimitKey("account", email);
  await executeRows(sql`delete from auth_rate_limits where key = ${key} returning key`);
}
