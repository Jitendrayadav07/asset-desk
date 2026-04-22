// models/asset_condition.js — Sequelize model for `asset_conditions`.
module.exports = (sequelize, DataTypes) => {
  const AssetCondition = sequelize.define(
    "AssetCondition",
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
      },
    },
    {
      tableName: "asset_conditions",
      timestamps: true,
      underscored: true,
    }
  );
  return AssetCondition;
};
