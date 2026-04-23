module.exports = (sequelize, DataTypes) => {
  const Assignment = sequelize.define(
    "Assignment",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      asset_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      employee_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      hostname: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      aid: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      assigned_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      unassigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      unassigned_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      unassigned_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "assignments",
      timestamps: true,
      underscored: true,
    }
  );
  return Assignment;
};
