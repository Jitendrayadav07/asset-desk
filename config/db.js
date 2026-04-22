const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("[db] DATABASE_URL is not set — pg pool will not be able to connect.");
}

const needsSsl = connectionString &&
  (connectionString.includes("supabase") ||
   connectionString.includes("sslmode=require") ||
   process.env.NODE_ENV === "production");

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pg pool error:", err);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
