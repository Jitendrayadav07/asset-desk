// models/asset_status.js — Sequelize model for `asset_statuses`.
module.exports = (sequelize, DataTypes) => {
  const AssetStatus = sequelize.define(
    "AssetStatus",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: "asset_statuses",
      timestamps: true,
      underscored: true,
    }
  );
  return AssetStatus;
};
