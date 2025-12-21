const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Timetable",
    {
      timetableID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userID: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: "TIMETABLE",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    }
  );
};
