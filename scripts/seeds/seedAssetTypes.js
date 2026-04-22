/**
 * Seed script for asset_types.
 * Run: node scripts/seeds/seedAssetTypes.js
 *
 * Creates `asset_types` via Sequelize sync if missing, then inserts rows.
 */
require("dotenv").config();

const db = require("../../config/db.config");

const ASSET_TYPES = [
  { name: "Laptop" },
  { name: "Desktop" },
  { name: "Monitor" },
  { name: "TV" },
  { name: "Server" },
  { name: "Phone" },
  { name: "Tablet" },
  { name: "Printer" },
  { name: "Network" },
  { name: "Accessory" },
  { name: "Other" },
];

const seedAssetTypes = async () => {
  try {
    await db.sequelize.sync();
    await db.assetType.bulkCreate(ASSET_TYPES, {
      ignoreDuplicates: true,
    });
    console.log("Asset types seeded successfully:", ASSET_TYPES.map((r) => r.name).join(", "));
  } catch (error) {
    console.error("Error seeding asset types:", error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
};

seedAssetTypes();
