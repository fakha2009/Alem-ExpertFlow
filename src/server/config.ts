import "server-only";

export function isDemoResetEnabled() {
  return process.env.ALLOW_DEMO_RESET === "true"
    && process.env.NODE_ENV !== "production"
    && process.env.VERCEL_ENV !== "production";
}
