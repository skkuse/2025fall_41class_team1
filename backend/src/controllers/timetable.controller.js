const { Timetable, TimetableItem } = require("../models");

// ======================================================
//                 PRIMARY TIMETABLE
// ======================================================

/**
 * 사용자 기본 시간표 조회
 * - 가장 먼저 생성된 시간표를 Primary로 간주
 * - 존재하지 않으면 기본 시간표 자동 생성
 */
const getPrimaryTimetable = async (req, res) => {
  try {
    const userID = req.user.userID;

    // 가장 오래된 시간표 조회
    let timetable = await Timetable.findOne({
      where: { userID },
      order: [["createdAt", "ASC"]],
      include: [{ model: TimetableItem, as: "items" }],
    });

    // 시간표가 없는 경우 기본 시간표 생성
    if (!timetable) {
      timetable = await Timetable.create({
        userID,
        title: "기본 시간표",
        season: "2025 1학기", // Default season
      });

      // items 포함하여 재조회
      timetable = await Timetable.findByPk(timetable.timetableID, {
        include: [{ model: TimetableItem, as: 'items' }]
      });
    }

    return res.json({ success: true, timetable });
  } catch (err) {
    console.error("Get Primary Timetable Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};


// ======================================================
//                   TIMETABLE CRUD
// ======================================================

/**
 * 시간표 생성
 */
const createTimetable = async (req, res) => {
  try {
    const userID = req.user.userID;
    const { season, title } = req.body;

    const newTimetable = await Timetable.create({
      userID,
      season,
      title: title || `${season} 시간표`,
    });

    return res.status(201).json({
      success: true,
      message: "시간표가 생성되었습니다.",
      timetable: newTimetable,
    });
  } catch (err) {
    console.error("Timetable Create Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

/**
 * 내 시간표 목록 조회
 */
const getMyTimetables = async (req, res) => {
  try {
    const userID = req.user.userID;

    const timetables = await Timetable.findAll({
      where: { userID },
      include: [{ model: TimetableItem, as: "items" }],
      order: [["createdAt", "DESC"]],
    });

    return res.json({ success: true, timetables });
  } catch (err) {
    console.error("Get Timetables Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

/**
 * 시간표 수정
 * - 본인 소유 시간표만 수정 가능
 */
const updateTimetable = async (req, res) => {
  try {
    const { timetableID } = req.params;
    const userID = req.user.userID;
    const { title, season } = req.body;

    const timetable = await Timetable.findOne({
      where: { timetableID, userID },
    });

    if (!timetable) {
      return res.status(403).json({ success: false, message: "권한이 없습니다." });
    }

    timetable.title = title ?? timetable.title;
    timetable.season = season ?? timetable.season;
    await timetable.save();

    return res.json({
      success: true,
      message: "시간표 정보가 수정되었습니다.",
      timetable,
    });
  } catch (err) {
    console.error("Update Timetable Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

/**
 * 시간표 삭제
 * - CASCADE 옵션으로 시간표 아이템도 함께 삭제
 */
const deleteTimetable = async (req, res) => {
  try {
    const { timetableID } = req.params;
    const userID = req.user.userID;

    const timetable = await Timetable.findOne({ where: { timetableID, userID } });
    if (!timetable)
      return res.status(404).json({ success: false, message: "삭제할 시간표가 없습니다." });

    await timetable.destroy(); // CASCADE option in model handles deleting items

    return res.json({ success: true, message: "시간표가 삭제되었습니다." });
  } catch (err) {
    console.error("Delete Timetable Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

// ======================================================
//                TIMETABLE ITEM CRUD
// ======================================================

/**
 * Primary TimeTable에 과목 추가
 * - Primary TimeTable이 없으면 자동 생성
 * - 내부적으로 addTimetableItem 재사용
 */
const addPrimaryTimetableItem = async (req, res, next) => {
  try {
    const userID = req.user.userID;

    // Find the primary timetable (or create one)
    let timetable = await Timetable.findOne({
      where: { userID },
      order: [["createdAt", "ASC"]],
    });

    if (!timetable) {
      timetable = await Timetable.create({
        userID,
        title: "기본 시간표",
      });
    }

    // timetableID를 주입하여 기존 로직 재사용
    req.params.timetableID = timetable.timetableID;
    return addTimetableItem(req, res);

  } catch (err) {
    console.error("Add Primary Item Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

/**
 * 시간표 과목 추가
 */
const addTimetableItem = async (req, res) => {
  try {
    const userID = req.user.userID;
    const { timetableID } = req.params;
    const { courseName, dayOfWeek, startTime, endTime, location, alias, color } = req.body;

    // 본인 시간표인지 검증
    const timetable = await Timetable.findOne({ where: { timetableID, userID } });
    if (!timetable) return res.status(403).json({ success: false, message: "해당 시간표에 접근할 수 없습니다." });

    const newItem = await TimetableItem.create({
      timetableID,
      courseName,
      dayOfWeek,
      startTime,
      endTime,
      location,
      alias,
      color,
    });

    return res.status(201).json({ success: true, message: "과목이 추가되었습니다.", data: newItem });
  } catch (err) {
    console.error("Add Item Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

/**
 * 시간표 과목 수정
 * - 소유 시간표 검증 후 수정 가능
 */
const updateTimetableItem = async (req, res) => {
  try {
    const userID = req.user.userID;
    const { itemID } = req.params;

    const item = await TimetableItem.findByPk(itemID);
    if (!item) return res.status(404).json({ success: false, message: "항목이 존재하지 않습니다." });

    const timetable = await Timetable.findOne({ where: { timetableID: item.timetableID, userID } });
    if (!timetable) return res.status(403).json({ success: false, message: "수정 권한이 없습니다." });

    await item.update(req.body);

    return res.json({ success: true, message: "과목 수정 완료", data: item });
  } catch (err) {
    console.error("Update Item Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

/**
 * 시간표 과목 삭제
 * - 소유 시간표 검증 후 삭제
 */
const deleteTimetableItem = async (req, res) => {
  try {
    const userID = req.user.userID;
    const { itemID } = req.params;

    const item = await TimetableItem.findByPk(itemID);
    if (!item) return res.status(404).json({ success: false, message: "항목 없음" });

    const timetable = await Timetable.findOne({ where: { timetableID: item.timetableID, userID } });
    if (!timetable) return res.status(403).json({ success: false, message: "삭제 권한이 없습니다." });

    await item.destroy();

    return res.json({ success: true, message: "과목 삭제 완료" });
  } catch (err) {
    console.error("Delete Item Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  getPrimaryTimetable,
  createTimetable,
  getMyTimetables,
  updateTimetable,
  deleteTimetable,
  addPrimaryTimetableItem,
  addTimetableItem,
  updateTimetableItem,
  deleteTimetableItem,
};