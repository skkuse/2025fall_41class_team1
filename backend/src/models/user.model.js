const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      userID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: DataTypes.STRING(254), unique: true, allowNull: false },
      name: { type: DataTypes.STRING(50), allowNull: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      campus: { type: DataTypes.STRING(50), allowNull: true },
      admissionYear: { type: DataTypes.INTEGER, allowNull: true },
      semester: { type: DataTypes.INTEGER, allowNull: true },
      department: { type: DataTypes.STRING(80), allowNull: true },
      campus: { type: DataTypes.STRING(50), allowNull: true },  // 추가: 캠퍼스 정보
      admissionYear: { type: DataTypes.INTEGER, allowNull: true },  // 추가: 입학년도
      grade: { type: DataTypes.INTEGER, allowNull: true },  // 현재 학년
      semester: { type: DataTypes.INTEGER, allowNull: true },  // 추가: 현재 학기 (1 or 2)
      additional_info: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "USER",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    }
  );

  // Hook: User 생성 시 기본 시간표 및 캘린더 생성
  User.afterCreate(async (user, options) => {
    const { Timetable, Calendar } = sequelize.models;

    console.log(`Creating default calendar & timetable for user: ${user.userID}`);

    await Timetable.create({
      userID: user.userID,
      season: null,
      title: "기본 시간표",
    });

    await Calendar.create({
      userID: user.userID,
      title: "기본 캘린더",
    });


    console.log(`Default calendar & timetable created for user: ${user.userID}`);
  });

  return User;
};
