const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Calendar",
    {
      calendarID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userID: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "캘린더 이름",
      },
    },
    {
      tableName: "CALENDAR",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    }
  );
};
