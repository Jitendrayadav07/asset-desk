// @ts-nocheck — Sequelize `.define()` shape confuses ts-check on plain JS files.
// models/user.js — same pattern as employee.js (timestamps → created_at / updated_at).
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      display_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      given_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      family_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      microsoft_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      login_type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "user",
        validate: {
          isIn: [["admin", "user"]],
        },
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
    }
  );
};
