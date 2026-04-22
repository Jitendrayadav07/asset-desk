require("dotenv").config();

const { pool } = require("../config/db");

(async () => {
  let exitCode = 0;

  console.log("== Postgres (pg pool via DATABASE_URL) ==");
  try {
    const { rows } = await pool.query(
      "SELECT NOW() as server_time, current_database() as database, current_user as user"
    );
    console.log("✓ pg pool connected");
    console.log("  server time:", rows[0].server_time);
    console.log("  database:   ", rows[0].database);
    console.log("  user:       ", rows[0].user);
  } catch (err) {
    console.error("✗ pg pool failed:", err.message);
    exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }

  process.exit(exitCode);
})();
