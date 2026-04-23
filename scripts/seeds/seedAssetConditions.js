/**
 * Seed script for asset_conditions (a.k.a. "Purchase Type" in the UI).
 * Run: node scripts/seeds/seedAssetConditions.js
 *
 * Creates `asset_conditions` via Sequelize sync if missing, then upserts rows.
 * Legacy `good` / `fair` / `poor` rows are migrated to `refurbished` so any
 * assets that previously referenced them remain valid.
 */
require("dotenv").config();

const db = require("../../config/db.config");

const ASSET_CONDITIONS = [{ name: "new" }, { name: "refurbished" }];

const LEGACY_CONDITIONS = ["good", "fair", "poor"];

const seedAssetConditions = async () => {
  try {
    await db.sequelize.sync();

    await db.assetCondition.bulkCreate(ASSET_CONDITIONS, {
      ignoreDuplicates: true,
    });

    const refurbished = await db.assetCondition.findOne({
      where: { name: "refurbished" },
    });
    if (refurbished) {
      for (const legacyName of LEGACY_CONDITIONS) {
        const legacyRow = await db.assetCondition.findOne({ where: { name: legacyName } });
        if (!legacyRow) continue;
        await db.asset.update(
          { asset_condition_id: refurbished.id },
          { where: { asset_condition_id: legacyRow.id } }
        );
        await legacyRow.destroy();
      }
    }

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
