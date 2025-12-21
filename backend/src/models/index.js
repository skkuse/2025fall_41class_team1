// models/index.js

/**
 * Sequelize 모델 엔트리 포인트
 * - models 디렉토리 내 모든 모델 파일 자동 로딩
 * - 모델 간 관계(Association) 정의
 * - 초기화된 db 객체를 export
 */

const fs = require("fs");
const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");

// Sequelize 인스턴스 (DB 연결 설정)
const sequelize = require("../config/db");

// 모든 모델을 담을 객체
const db = {};

console.log("Loading models...");

// ======================================================
// MODEL AUTO LOADING
// ======================================================

/**
 * models 디렉토리 내 모든 모델 파일 자동 등록
 * - index.js 자신은 제외
 * - .js 파일만 로딩
 * - 각 모델 파일은 (sequelize, DataTypes) => Model 형태를 반환
 */
fs.readdirSync(__dirname)
  .filter((file) => file !== "index.js" && file.endsWith(".js"))
  .forEach((file) => {
    console.log("Registering model:", file);

    // 모델 정의 함수 로드
    const modelDefiner = require(path.join(__dirname, file));

    // Sequelize 모델 생성
    const model = modelDefiner(sequelize, DataTypes);

    // 모델 이름을 key로 db 객체에 등록
    db[model.name] = model;
  });

// =============================
// RELATIONSHIPS
// =============================


/**
 * db 객체에서 필요한 모델 구조 분해 할당
 * - 모델 파일 이름과 model.name 이 일치해야 함
 */
const {
  User,
  Timetable,
  TimetableItem,
  Bookmark,
  Schedule,
  Calendar
} = db;


// ------------------------------------------------------
// USER → TIMETABLE (1:N)
// ------------------------------------------------------
/**
 * 한 명의 사용자는 여러 개의 시간표를 가질 수 있음
 * - userID를 foreignKey로 사용
 * - User 삭제 시 관련 Timetable 모두 삭제 (CASCADE)
 */
if (User && Timetable) {
  User.hasMany(Timetable, { foreignKey: "userID", onDelete: "CASCADE" });
  Timetable.belongsTo(User, { foreignKey: "userID" });
}

// ------------------------------------------------------
// TIMETABLE → TIMETABLE_ITEM (1:N)
// ------------------------------------------------------
/**
 * 하나의 시간표는 여러 개의 시간표 아이템(강의)을 가짐
 * - alias: items (Timetable.items)
 * - Timetable 삭제 시 관련 Item 모두 삭제
 */
if (Timetable && TimetableItem) {
  Timetable.hasMany(TimetableItem, { as: "items", foreignKey: "timetableID", onDelete: "CASCADE" });
  TimetableItem.belongsTo(Timetable, { foreignKey: "timetableID" });
}

// ------------------------------------------------------
// USER → BOOKMARK (1:N)
// ------------------------------------------------------
/**
 * 한 명의 사용자는 여러 개의 북마크를 가질 수 있음
 * - 북마크는 사용자 소유 데이터
 * - User 삭제 시 북마크 모두 삭제
 */
if (User && Bookmark) {
  User.hasMany(Bookmark, { foreignKey: "userID", onDelete: "CASCADE" });
  Bookmark.belongsTo(User, { foreignKey: "userID" });
}

// ------------------------------------------------------
// USER → CALENDAR (1:N)
// ------------------------------------------------------
/**
 * 한 명의 사용자는 하나 이상의 캘린더를 가질 수 있음
 * - 향후 개인/공유 캘린더 확장 고려
 */
if (User && Calendar) {
  User.hasMany(Calendar, {
    foreignKey: "userID",
    onDelete: "CASCADE"
  });

  Calendar.belongsTo(User, {
    foreignKey: "userID"
  });
}

// ------------------------------------------------------
// CALENDAR → SCHEDULE (1:N)
// ------------------------------------------------------
/**
 * 하나의 캘린더는 여러 개의 일정(Schedule)을 포함
 * - alias: schedules (Calendar.schedules)
 * - calendarID를 기준으로 연결
 * - 캘린더 삭제 시 일정 모두 삭제
 */
if (Calendar && Schedule) {
  Calendar.hasMany(Schedule, {
    as: "schedules",
    foreignKey: "calendarID",
    sourceKey: "calendarID",
    onDelete: "CASCADE",
  });

  Schedule.belongsTo(Calendar, {
    as: "calendars",
    foreignKey: "calendarID",
    targetKey: "calendarID",
  });
}


// =============================
// EXPORT
// =============================

/**
 * Sequelize 인스턴스 및 클래스 export
 * - db.User, db.Bookmark 등으로 모델 접근 가능
 * - db.sequelize: 연결 객체
 * - db.Sequelize: Sequelize 클래스 (Op 등 사용 시)
 */
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;