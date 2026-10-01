// Applies SQL files to the Supabase database using SUPABASE_DB_URL from .env.local.
// Usage: node scripts/apply-sql.mjs <file.sql> [more.sql ...]
// The connection string is never printed.
import pg from "pg";
import { readFileSync } from "node:fs";

function readEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const url = readEnv().SUPABASE_DB_URL;
if (!url || url.includes("[YOUR-PASSWORD]")) {
  console.error("SUPABASE_DB_URL is missing from .env.local (or still contains [YOUR-PASSWORD]).");
  process.exit(1);
}

const files = process.argv.slice(2);
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  for (const file of files) {
    const started = Date.now();
    try {
      await client.query(readFileSync(file, "utf8"));
      console.log(`ok   ${file} (${Date.now() - started}ms)`);
    } catch (e) {
      console.error(`FAIL ${file}: ${e.message}${e.where ? "\n     where: " + e.where : ""}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
