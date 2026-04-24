// Append-only audit log. Each row is one significant user action. Metadata is
// JSONB so we can stash action-specific context without schema churn.
module.exports = (sequelize, DataTypes) => {
  const Activity = sequelize.define(
    "Activity",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      actor_user_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      actor_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      actor_role: {
        type: DataTypes.STRING(16),
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      entity_label: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: "activities",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      underscored: true,
    }
  );
  return Activity;
};
