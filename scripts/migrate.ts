import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import postgres from "postgres";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required to run migrations.");
}

const migrationsDir = join(process.cwd(), "src", "server", "db", "migrations");

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 10
});

async function main() {
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  await sql`
    create table if not exists _alem_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const appliedRows = await sql`select name from _alem_migrations`;
  const applied = new Set(appliedRows.map((row) => String(row.name)));

  for (const file of files) {
    const name = basename(file);

    if (applied.has(name)) {
      console.log(`Skipped ${name}: already applied.`);
      continue;
    }

    const migrationSql = readFileSync(join(migrationsDir, file), "utf8");

    await sql.begin(async (tx) => {
      await tx.unsafe(migrationSql);
      await tx`
        insert into _alem_migrations (name)
        values (${name})
        on conflict (name) do nothing
      `;
    });

    console.log(`Applied ${name}.`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
