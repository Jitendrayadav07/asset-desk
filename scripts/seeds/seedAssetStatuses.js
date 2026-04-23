/**
 * Seed script for asset_statuses.
 * Run: node scripts/seeds/seedAssetStatuses.js
 *
 * Creates `asset_statuses` via Sequelize sync if missing, then upserts rows.
 * Also migrates a legacy `active` row to `unassigned` so existing assets keep
 * a valid status_id after renaming.
 */
require("dotenv").config();

const db = require("../../config/db.config");

const ASSET_STATUSES = [
  { name: "unassigned" },
  { name: "assigned" },
  { name: "maintenance" },
  { name: "retired" },
  { name: "missing" },
];

const seedAssetStatuses = async () => {
  try {
    await db.sequelize.sync();

    // Legacy rename: if an older `active` row exists (from the previous seed),
    // repurpose it as `unassigned` so assets that reference it don't break.
    const legacyActive = await db.assetStatus.findOne({ where: { name: "active" } });
    const existingUnassigned = await db.assetStatus.findOne({
      where: { name: "unassigned" },
    });
    if (legacyActive && !existingUnassigned) {
      await legacyActive.update({ name: "unassigned" });
    } else if (legacyActive && existingUnassigned) {
      // Both exist — point any assets on the old row to the new one, then drop it.
      await db.asset.update(
        { asset_status_id: existingUnassigned.id },
        { where: { asset_status_id: legacyActive.id } }
      );
      await legacyActive.destroy();
    }

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
