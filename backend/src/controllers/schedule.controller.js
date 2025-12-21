const { Calendar, Schedule } = require("../models");
const axios = require("axios");

/**
 * FastAPI 서버 주소
 * - LLM 기반 일정 추출 담당
 * - 환경변수 우선, 없으면 로컬 기본값 사용
 */
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

// ======================================================
//               일정 추출 (LLM 기반)
// ======================================================
/**
 * 채팅 질문/답변으로부터 일정 추출
 * - FastAPI(LLM)에 question + answer 전달
 * - DB에는 저장하지 않고 "추출 결과만" 반환
 * - 실제 저장 여부는 프론트에서 사용자 선택 후 결정
 */
const createScheduleFromChat = async (req, res) => {
  try {
    const { question, answer } = req.body;

    // --------------------------------------------------
    // 0. 필수 입력값 검증
    // --------------------------------------------------
    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "question과 answer는 필수입니다.",
      });
    }

    // --------------------------------------------------
    // 1. FastAPI에 일정 추출 요청
    // --------------------------------------------------
    const response = await axios.post(`${FASTAPI_URL}/schedule/summary`, {
      question,
      answer,
    });

    let scheduleData = response.data?.schedule;

    // --------------------------------------------------
    // 2. 일정 추출 실패 (null / undefined)
    // --------------------------------------------------
    if (!scheduleData) {
      return res.status(400).json({
        success: false,
        message: "일정을 추출할 수 없습니다.",
      });
    }

    // --------------------------------------------------
    // 3. 단일 객체 / 배열 구조 통일
    // --------------------------------------------------
    const scheduleList = Array.isArray(scheduleData)
      ? scheduleData
      : [scheduleData];

    // --------------------------------------------------
    // 4. 최소 유효성 검사
    // - title + startDate 필수
    // --------------------------------------------------
    const validSchedules = scheduleList.filter(
      (s) => s?.title && s?.startDate
    );

    if (validSchedules.length === 0) {
      return res.status(400).json({
        success: false,
        message: "유효한 일정 정보를 찾을 수 없습니다.",
        raw: scheduleList,
      });
    }

    /**
     * ⚠️ DB 저장 intentionally 제거
     * - 일정 추출 ≠ 일정 확정
     * - 프론트에서 선택 후 addPrimaryScheduleItem() 호출
     */
    return res.status(200).json({
      success: true,
      message: `${validSchedules.length}개의 일정이 추출되었습니다.`,
      schedules: validSchedules,
    });

  } catch (err) {
    console.error("Extract Schedule Error:", err);

    // FastAPI가 400 보내는 경우
    if (err.response?.status === 400) {
      return res.status(400).json({
        success: false,
        message: err.response.data.detail || "일정 추출 실패",
      });
    }

    // 기타 내부 오류
    return res.status(500).json({
      success: false,
      message: "일정 추출 중 오류 발생",
      error: err.message,
    });
  }
};


// ======================================================
//               PRIMARY CALENDAR
// ======================================================

/**
 * 사용자 기본 캘린더 조회
 * - 가장 먼저 생성된 캘린더를 Primary로 사용
 * - 존재하지 않으면 자동 생성
 */
const getPrimaryCalendar = async (req, res) => {
  try {
    const userID = req.user.userID;

    // 가장 오래된 캘린더 = Primary Calendar
    let calendar = await Calendar.findOne({
      where: { userID },
      order: [["createdAt", "ASC"]],
      include: [{ model: Schedule, as: "schedules" }], // Corrected alias
    });

    if (!calendar) {
      calendar = await Calendar.create({
        userID,
        title: "기본 캘린더",
        color: "#3B82F6", // Default color
      });
      // Re-query to include schedules array
      calendar = await Calendar.findByPk(calendar.calendarID, {
        include: [{ model: Schedule, as: 'schedules' }] // Corrected alias
      });
    }

    return res.json({ success: true, calendar });
  } catch (err) {
    console.error("Get Primary Calendar Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

// ======================================================
//                   CALENDAR CRUD
// ======================================================

/**
 * 캘린더 생성
 */
const createCalendar = async (req, res) => {
  try {
    const userID = req.user.userID;
    const { title, color } = req.body;

    const newCalendar = await Calendar.create({
      userID,
      title: title || "새 캘린더",
      color: color || "#3B82F6", // Default color
    });

    return res.status(201).json({
      success: true,
      message: "캘린더가 생성되었습니다.",
      calendar: newCalendar,
    });
  } catch (err) {
    console.error("Calendar Create Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

/**
 * 내 캘린더 목록 조회
 */
const getMyCalendars = async (req, res) => {
  try {
    const userID = req.user.userID;

    const calendars = await Calendar.findAll({
      where: { userID },
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      calendars,
    });
  } catch (err) {
    console.error("Get Calendars Error:", err);
    return res.status(500).json({
      success: false,
      message: "캘린더 조회 실패",
    });
  }
};

/**
 * 캘린더 수정
 */
const updateCalendar = async (req, res) => {
  try {
    const userID = req.user.userID;
    const { calendarID } = req.params;
    const { title } = req.body;

    const calendar = await Calendar.findOne({
      where: { calendarID, userID },
    });

    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: "캘린더를 찾을 수 없습니다.",
      });
    }

    calendar.title = title ?? calendar.title;
    await calendar.save();

    return res.json({
      success: true,
      message: "캘린더가 수정되었습니다.",
      calendar,
    });
  } catch (err) {
    console.error("Update Calendar Error:", err);
    return res.status(500).json({
      success: false,
      message: "캘린더 수정 실패",
    });
  }
};

/**
 * 캘린더 삭제
 * - Schedule은 CASCADE 옵션으로 함께 삭제
 */
const deleteCalendar = async (req, res) => {
  try {
    const { calendarID } = req.params;
    const userID = req.user.userID;

    const calendar = await Calendar.findOne({ where: { calendarID, userID } });
    if (!calendar)
      return res.status(404).json({ success: false, message: "삭제할 캘린더가 없습니다." });

    await calendar.destroy(); // CASCADE option in model handles deleting schedules

    return res.json({ success: true, message: "캘린더가 삭제되었습니다." });
  } catch (err) {
    console.error("Delete Calendar Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

// ======================================================
//                   SCHEDULE CRUD
// ======================================================

/**
 * Primary Calendar에 일정 추가
 * - Primary Calendar가 없으면 자동 생성
 * - 내부적으로 addScheduleItem 재사용
 */
const addPrimaryScheduleItem = async (req, res, next) => {
  try {
    const userID = req.user.userID;

    // Find the primary calendar (or create one)
    let calendar = await Calendar.findOne({
      where: { userID },
      order: [["createdAt", "ASC"]],
    });

    if (!calendar) {
      calendar = await Calendar.create({
        userID,
        title: "기본 캘린더",
      });
    }

    // Set the calendarID in the request params and pass to the existing handler
    req.params.calendarID = calendar.calendarID;
    return addScheduleItem(req, res);

  } catch (err) {
    console.error("Add Primary Schedule Item Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};

/**
 * 일정 추가
 */
const addScheduleItem = async (req, res) => {
  try {
    const userID = req.user.userID;
    const { calendarID } = req.params;

    const {
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      type,
      location,
      color, // Add color field
      courseName, // Add courseName field
    } = req.body;

    // 본인 캘린더인지 확인
    const calendar = await Calendar.findOne({
      where: { calendarID, userID },
    });

    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: "캘린더가 존재하지 않습니다.",
      });
    }

    const schedule = await Schedule.create({
      calendarID,
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      type,
      location,
      color, // Pass color to create
      courseName, // Pass courseName to create
    });

    return res.status(201).json({
      success: true,
      message: "일정이 추가되었습니다.",
      schedule,
    });
  } catch (err) {
    console.error("Add Schedule Error:", err);
    return res.status(500).json({
      success: false,
      message: "일정 추가 실패",
    });
  }
};

/**
 * 일정 수정
 */
const updateScheduleItem = async (req, res) => {
  try {
    const { itemID } = req.params;

    const {
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      type,
      location,
      color, // Add color field
      courseName, // Add courseName field
    } = req.body;

    const schedule = await Schedule.findByPk(itemID);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "일정을 찾을 수 없습니다.",
      });
    }

    schedule.title = title ?? schedule.title;
    schedule.description = description ?? schedule.description;
    schedule.startDate = startDate ?? schedule.startDate;
    schedule.endDate = endDate ?? schedule.endDate;
    schedule.isAllDay = isAllDay ?? schedule.isAllDay;
    schedule.type = type ?? schedule.type;
    schedule.location = location ?? schedule.location;
    schedule.color = color ?? schedule.color; // Update color field
    schedule.courseName = courseName ?? schedule.courseName; // Update courseName field

    await schedule.save();

    return res.json({
      success: true,
      message: "일정이 수정되었습니다.",
      schedule,
    });
  } catch (err) {
    console.error("Update Schedule Error:", err);
    return res.status(500).json({
      success: false,
      message: "일정 수정 실패",
    });
  }
};

/**
 * 일정 삭제
 */
const deleteScheduleItem = async (req, res) => {
  try {
    const { itemID } = req.params;

    const schedule = await Schedule.findByPk(itemID);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "삭제할 일정이 없습니다.",
      });
    }

    await schedule.destroy();

    return res.json({
      success: true,
      message: "일정이 삭제되었습니다.",
    });
  } catch (err) {
    console.error("Delete Schedule Error:", err);
    return res.status(500).json({
      success: false,
      message: "일정 삭제 실패",
    });
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  createScheduleFromChat,
  getMyCalendars,
  updateCalendar,
  addScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  getPrimaryCalendar,
  addPrimaryScheduleItem,
  createCalendar,
  deleteCalendar,
};
