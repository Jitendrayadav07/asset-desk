// Physical asset inventory row; FKs to asset_types, asset_statuses, asset_conditions.
module.exports = (sequelize, DataTypes) => {
  const Asset = sequelize.define(
    "Asset",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      serial_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      asset_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      asset_status_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      asset_condition_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      name_model: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      brand: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      model_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      configuration_specs: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      purchase_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      price_usd: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      retired_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      retired_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      retired_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      missing_since: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      missing_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      last_known_location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      reported_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "assets",
      timestamps: true,
      underscored: true,
    }
  );
  return Asset;
};
