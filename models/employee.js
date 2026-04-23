module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define(
    "Employee",
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
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      emp_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      left_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      left_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      left_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "employees",
      timestamps: true,
      underscored: true,
    }
  );
  return Employee;
};
