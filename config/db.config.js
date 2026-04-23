// Aggregates Sequelize models (lookup tables; no SQL migrations for these).
const { Sequelize } = require("sequelize");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

const needsSsl =
  connectionString &&
  (connectionString.includes("supabase") ||
    connectionString.includes("sslmode=require") ||
    process.env.NODE_ENV === "production");

const sequelize = new Sequelize(connectionString, {
  dialect: "postgres",
  dialectOptions: needsSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.assetType = require("../models/asset_type")(sequelize, Sequelize);
db.assetCondition = require("../models/asset_condition")(sequelize, Sequelize);
db.assetStatus = require("../models/asset_status")(sequelize, Sequelize);
db.asset = require("../models/asset")(sequelize, Sequelize);
db.employee = require("../models/employee")(sequelize, Sequelize);
db.assignment = require("../models/assignment")(sequelize, Sequelize);

db.asset.belongsTo(db.assetType, { foreignKey: "asset_type_id", as: "assetType" });
db.asset.belongsTo(db.assetStatus, { foreignKey: "asset_status_id", as: "assetStatus" });
db.asset.belongsTo(db.assetCondition, { foreignKey: "asset_condition_id", as: "assetCondition" });

db.assignment.belongsTo(db.asset, { foreignKey: "asset_id", as: "asset" });
db.assignment.belongsTo(db.employee, { foreignKey: "employee_id", as: "employee" });
db.asset.hasMany(db.assignment, { foreignKey: "asset_id", as: "assignments" });
db.employee.hasMany(db.assignment, { foreignKey: "employee_id", as: "assignments" });

sequelize
  .authenticate()
  .then(() => {
    console.log("[sequelize] Database connection has been established successfully.");
  })
  .catch((err) => {
    console.error("[sequelize] Unable to connect to the database:", err.message);
  });

module.exports = db;
