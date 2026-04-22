require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query("SELECT name FROM _migrations ORDER BY name ASC");
  return new Set(rows.map((r) => r.name));
}

async function applyMigration(client, fileName, sql) {
  console.log(`→ Applying ${fileName}`);
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO _migrations (name) VALUES ($1)", [fileName]);
    await client.query("COMMIT");
    console.log(`✓ Applied ${fileName}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw new Error(`Failed to apply ${fileName}: ${err.message}`);
  }
}

(async () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log("No migrations directory found at scripts/migrations/");
    process.exit(0);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No .sql migration files found.");
    process.exit(0);
  }

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log("All migrations already applied.");
      return;
    }

    console.log(`Pending migrations: ${pending.length}`);
    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      await applyMigration(client, file, sql);
    }

    console.log("\nAll migrations applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
})();
