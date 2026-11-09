const fs = require("fs");
const path = require("path");

function loadEnvFile(file) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;

if (!url) {
  console.error("[db:down] DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

(async () => {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { prepare: false, max: 1, onnotice: () => undefined });
  try {
    console.log("[db:down] Dropping all application data...");
    await sql`drop table if exists app_documents`;
    console.log("[db:down] Done. Run `npm run seed` to repopulate the database.");
  } finally {
    await sql.end({ timeout: 5 });
  }
})().catch((err) => {
  console.error("[db:down] Failed:", err.message);
  process.exit(1);
});
