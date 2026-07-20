import { existsSync } from "node:fs";
import { closeDb } from "@/server/db/client";
import { resetDemoData } from "@/server/services/demo-data";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Demo seed is disabled in production.");
  }

  if (process.env.ALLOW_DEMO_RESET !== "true") {
    throw new Error("Demo seed is disabled. Set ALLOW_DEMO_RESET=true only in a local development environment.");
  }

  await resetDemoData();
  console.log("Seed completed: users, skills, experts, requests, assignments, comments and activity logs created.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
