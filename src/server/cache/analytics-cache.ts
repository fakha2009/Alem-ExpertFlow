import "server-only";

import { deleteRedisKeys, withRedisCache } from "@/server/cache/redis";

export const ANALYTICS_CACHE_TTL_SECONDS = 15;

export const analyticsCacheKeys = {
  dashboardMetrics: "aef:analytics:dashboard-metrics:v2",
  breakdown: "aef:analytics:breakdown:v2",
  requestTrend(days: number) {
    return `aef:analytics:request-trend:${days}:v2`;
  }
};

export function withAnalyticsCache<T>(key: string, loader: () => Promise<T>) {
  return withRedisCache(key, ANALYTICS_CACHE_TTL_SECONDS, loader);
}

export async function invalidateAnalyticsCache() {
  await deleteRedisKeys([
    analyticsCacheKeys.dashboardMetrics,
    analyticsCacheKeys.breakdown,
    analyticsCacheKeys.requestTrend(14)
  ]);
}
