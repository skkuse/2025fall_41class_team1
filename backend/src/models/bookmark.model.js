const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Bookmark",
    {
      bookmarkID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "북마크 소유자",
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: "대화 제목 (LLM 자동 생성)",
      },
      question: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "사용자 질문",
      },
      answer: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "AI 답변",
      },
      sources: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "참고 문서 출처 정보",
      },
    },
    {
      tableName: "BOOKMARK",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    }
  );
};