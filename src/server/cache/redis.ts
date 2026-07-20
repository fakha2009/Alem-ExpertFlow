import "server-only";

import { Redis } from "@upstash/redis";

type CacheLoader<T> = () => Promise<T>;
type MemoryCacheEntry = {
  expiresAt: number;
  value: unknown;
};

let redisClient: Redis | null | undefined;
const memoryCache = new Map<string, MemoryCacheEntry>();
const MAX_MEMORY_CACHE_ENTRIES = 100;

function getMemoryCache<T>(key: string): { hit: true; value: T } | { hit: false } {
  const entry = memoryCache.get(key);
  if (!entry) return { hit: false };

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return { hit: false };
  }

  return { hit: true, value: entry.value as T };
}

function setMemoryCache<T>(key: string, ttlSeconds: number, value: T) {
  if (ttlSeconds <= 0) return;

  if (!memoryCache.has(key) && memoryCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  memoryCache.set(key, {
    expiresAt: Date.now() + ttlSeconds * 1000,
    value
  });
}

export function getRedis() {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function isRedisConfigured() {
  return getRedis() !== null;
}

export async function withRedisCache<T>(key: string, ttlSeconds: number, loader: CacheLoader<T>) {
  const memoryCached = getMemoryCache<T>(key);
  if (memoryCached.hit) return memoryCached.value;

  const redis = getRedis();
  if (!redis) {
    const value = await loader();
    setMemoryCache(key, ttlSeconds, value);
    return value;
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      setMemoryCache(key, ttlSeconds, cached);
      return cached;
    }

    const value = await loader();
    await redis.set(key, value, { ex: ttlSeconds });
    setMemoryCache(key, ttlSeconds, value);
    return value;
  } catch (error) {
    console.warn("[redis] Cache bypassed", {
      name: error instanceof Error ? error.name : typeof error
    });
    const value = await loader();
    setMemoryCache(key, ttlSeconds, value);
    return value;
  }
}

export async function deleteRedisKeys(keys: string[]) {
  keys.forEach((key) => memoryCache.delete(key));

  const redis = getRedis();
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(...keys);
  } catch (error) {
    console.warn("[redis] Cache invalidation skipped", {
      name: error instanceof Error ? error.name : typeof error
    });
  }
}
