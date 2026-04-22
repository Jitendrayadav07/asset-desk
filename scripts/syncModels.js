/**
 * Creates / updates tables from Sequelize models (including `assets`).
 * Run after migrations or when schema changed: npm run db:sync
 */
require("dotenv").config();

const db = require("../config/db.config");

(async () => {
  try {
    await db.sequelize.sync();
    console.log("Sequelize sync completed.");
  } catch (err) {
    console.error("Sync failed:", err.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
})();
