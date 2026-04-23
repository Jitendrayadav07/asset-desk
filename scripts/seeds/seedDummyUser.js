/**
 * Creates one dummy row in `users` for local/testing checks.
 * Run: npm run db:seed:dummy-user
 * Or:  node scripts/seeds/seedDummyUser.js
 *
 * Override email / name via env:
 *   DUMMY_USER_EMAIL=test@example.com DUMMY_USER_DISPLAY_NAME="Test User" npm run db:seed:dummy-user
 */
require("dotenv").config();

const db = require("../../config/db.config");
const { LOGIN_TYPE } = require("../../constants/userConstants");

const EMAIL =
  process.env.DUMMY_USER_EMAIL || "dummy.user@assetdesk.local";
const DISPLAY_NAME =
  process.env.DUMMY_USER_DISPLAY_NAME || "Dummy User";

async function seedDummyUser() {
  try {
    await db.sequelize.sync();

    const existing = await db.user.findOne({
      where: { email: EMAIL.toLowerCase() },
    });
    if (existing) {
      console.log("[seedDummyUser] User already exists:", EMAIL);
      console.log(JSON.stringify(existing.get({ plain: true }), null, 2));
      return;
    }

    const row = await db.user.create({
      email: EMAIL.toLowerCase(),
      display_name: DISPLAY_NAME,
      given_name: "Dummy",
      family_name: "User",
      microsoft_id: null,
      login_type: LOGIN_TYPE.EMAIL,
      is_active: true,
    });

    console.log("[seedDummyUser] Created dummy user:");
    console.log(JSON.stringify(row.get({ plain: true }), null, 2));
  } catch (err) {
    console.error("[seedDummyUser] Failed:", err.message);
    if (err.name === "SequelizeUniqueConstraintError") {
      console.error("Duplicate email — pick another DUMMY_USER_EMAIL.");
    }
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

seedDummyUser();
