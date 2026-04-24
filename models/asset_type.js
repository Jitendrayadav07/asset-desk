// models/asset_type.js — Sequelize model for `asset_types`.
module.exports = (sequelize, DataTypes) => {
  const AssetType = sequelize.define(
    "AssetType",
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
      tableName: "asset_types",
      timestamps: true,
      underscored: true,
    }
  );
  return AssetType;
};
