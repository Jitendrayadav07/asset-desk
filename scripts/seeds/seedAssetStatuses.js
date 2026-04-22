/**
 * Seed script for asset_statuses.
 * Run: node scripts/seeds/seedAssetStatuses.js
 *
 * Creates `asset_statuses` via Sequelize sync if missing, then inserts rows.
 */
require("dotenv").config();

const db = require("../../config/db.config");

const ASSET_STATUSES = [
  { name: "active" },
  { name: "maintenance" },
  { name: "retired" },
  { name: "missing" },
];

const seedAssetStatuses = async () => {
  try {
    await db.sequelize.sync();
    await db.assetStatus.bulkCreate(ASSET_STATUSES, {
      ignoreDuplicates: true,
    });
    console.log(
      "Asset statuses seeded successfully:",
      ASSET_STATUSES.map((r) => r.name).join(", ")
    );
  } catch (error) {
    console.error("Error seeding asset statuses:", error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
};

seedAssetStatuses();
