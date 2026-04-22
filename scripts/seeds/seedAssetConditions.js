/**
 * Seed script for asset_conditions.
 * Run: node scripts/seeds/seedAssetConditions.js
 *
 * Creates `asset_conditions` via Sequelize sync if missing, then inserts rows.
 */
require("dotenv").config();

const db = require("../../config/db.config");

const ASSET_CONDITIONS = [
  { name: "new" },
  { name: "good" },
  { name: "fair" },
  { name: "poor" },
];

const seedAssetConditions = async () => {
  try {
    await db.sequelize.sync();
    await db.assetCondition.bulkCreate(ASSET_CONDITIONS, {
      ignoreDuplicates: true,
    });
    console.log(
      "Asset conditions seeded successfully:",
      ASSET_CONDITIONS.map((r) => r.name).join(", ")
    );
  } catch (error) {
    console.error("Error seeding asset conditions:", error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
};

seedAssetConditions();
