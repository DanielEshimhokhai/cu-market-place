// Runs the Supabase migrations, seed and RLS tests against an in-process Postgres (PGlite)
// with stubbed auth/storage schemas. This catches SQL errors before running them on Supabase.
// Usage: node scripts/db-check.mjs [--no-seed]
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync, existsSync } from "node:fs";

const withSeed = !process.argv.includes("--no-seed");
const files = [
  "supabase/tests/supabase-stubs.sql",
  "supabase/migrations/0001_schema.sql",
  "supabase/migrations/0002_functions.sql",
  "supabase/migrations/0003_policies.sql",
  ...(withSeed ? ["supabase/seed.sql", "supabase/tests/rls.sql"] : []),
];

const db = await PGlite.create({ extensions: { pg_trgm } });
for (const file of files) {
  if (!existsSync(file)) { console.error(`missing ${file}`); process.exit(1); }
  const started = Date.now();
  try {
    const results = await db.exec(readFileSync(file, "utf8"));
    const last = results.at(-1)?.rows?.at(-1);
    console.log(`ok   ${file} (${Date.now() - started}ms)${last ? " → " + JSON.stringify(last) : ""}`);
  } catch (e) {
    console.error(`FAIL ${file}: ${e.message}${e.where ? "\n     where: " + e.where : ""}`);
    process.exit(1);
  }
}
if (withSeed) {
  const counts = await db.query(`select
    (select count(*) from public.businesses) as businesses, (select count(*) from public.products) as products,
    (select count(*) from public.orders) as orders, (select count(*) from public.reviews) as reviews,
    (select count(*) from public.messages) as messages`);
  console.log("counts", counts.rows[0]);
}
