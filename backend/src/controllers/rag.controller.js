const axios = require("axios");
const { User, Timetable, TimetableItem, Calendar, Schedule } = require("../models");

/**
 * FastAPI 서버 주소
 * - RAG 질의 / 번역 기능 담당
 * - 환경변수 우선, 없을 경우 로컬 기본값 사용
 */
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8001";

// ======================================================
// ASK RAG (STREAMING)
// ======================================================

/**
 * RAG 질문 처리
 * - 인증된 사용자만 접근 가능 (req.user 필요)
 * - 사용자 정보 + 시간표 + 캘린더 데이터를 수집하여
 *   FastAPI RAG 서버로 전달
 * - FastAPI 응답은 SSE 스트리밍 방식으로 클라이언트에 전달
 */
const askRAG = async (req, res) => {
  try {
    const userID = req.user.userID;
    const { message, history, isFirstQuestion } = req.body;
    const authHeader = req.headers.authorization;
    // --------------------------------------------------
    // 0. 필수 입력값 검증
    // --------------------------------------------------

    if (!authHeader) {
      return res.status(401).json({
      success: false,
      message: "로그인이 필요합니다. (토큰 없음)",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "질문 내용이 필요합니다.",
      });
    }

    // --------------------------------------------------
    // 1. 사용자 정보 조회
    // --------------------------------------------------
    const user = await User.findByPk(userID);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // --------------------------------------------------
    // 2. 시간표 데이터 조회
    // --------------------------------------------------
    const timetables = await Timetable.findAll({
      where: { userID },
      include: [{ model: TimetableItem, as: "items" }],
    });

    /**
     * 시간표 데이터 포맷팅
     * - FastAPI에서 사용하기 쉬운 flat 구조로 변환
     */
    const timetableData = [];
    timetables.forEach((table) => {
      if (table.items) {
        table.items.forEach((item) => {
          timetableData.push({
            courseName: item.courseName,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            location: item.location,
          });
        });
      }
    });


    // --------------------------------------------------
    // 2-1. 캘린더 일정 데이터 조회
    // --------------------------------------------------
    const calendars = await Calendar.findAll({
      where: { userID },
      include: [
        {
          model: Schedule,
          as: "schedules"
        },
      ],
    });

    /**
     * 캘린더 일정 포맷팅
     * - 일정 + 소속 캘린더 제목 함께 전달
     */
    const calendarData = [];

    calendars.forEach((calendar) => {
      if (calendar.schedules) {
        calendar.schedules.forEach((event) => {
          calendarData.push({
            title: event.title,
            startDate: event.startDate,
            endDate: event.endDate,
            startTime: event.startTime,
            endTime: event.endTime,
            isAllDay: event.isAllDay,
            type: event.type,
            location: event.location,
            courseName: event.courseName,
            calendarTitle: calendar.title,
          });
        });
      }
    });

    // --------------------------------------------------
    // 3. 사용자 정보 구성
    // --------------------------------------------------
    /**
     * Sequelize instance → plain object 변환
     * - FastAPI에 전달 가능한 JSON 형태로 변환
     */
    const userInfo = {
      ...user.toJSON(), // Sequelize instance → plain object
    };

    // --------------------------------------------------
    // 4. FastAPI RAG 서버 호출 (Streaming)
    // --------------------------------------------------
    const response = await axios.post(`${FASTAPI_URL}/chat`, {
      message,
      history: history || [],
      user_info: userInfo,
      timetable: timetableData,
      calendar: calendarData,

      is_first_question: isFirstQuestion || false,
    }, { responseType: "stream", headers:
      {Authorization: authHeader,},
    });

    // --------------------------------------------------
    // 5. SSE 헤더 설정
    // --------------------------------------------------
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    /**
     * FastAPI 스트림을 그대로 클라이언트로 전달
     * - Node 서버는 중계 역할만 수행
     */
    response.data.pipe(res);

  } catch (err) {
    console.error("RAG Ask Error:", err);

    // FastAPI 연결 오류
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "AI 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "답변 생성 중 오류가 발생했습니다.",
      error: err.message,
    });
  }
};


// ======================================================
// TRANSLATION
// ======================================================

/**
 * 번역 처리
 * - FastAPI 번역 엔드포인트 호출
 * - 현재 en ↔ ko 만 지원
 */
const translate = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    // --------------------------------------------------
    // 필수 입력값 검증
    // --------------------------------------------------
    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        message: "번역할 텍스트와 목표 언어가 필요합니다.",
      });
    }

    // --------------------------------------------------
    // 언어 코드 검증
    // --------------------------------------------------
    if (!["en", "ko"].includes(targetLanguage)) {
      return res.status(400).json({
        success: false,
        message: "지원하지 않는 언어입니다. (en, ko만 가능)",
      });
    }

    // --------------------------------------------------
    // FastAPI 번역 서버 호출
    // --------------------------------------------------
    const response = await axios.post(`${FASTAPI_URL}/translate`, {
      text,
      target_language: targetLanguage,
    });

    return res.json({
      success: true,
      translated_text: response.data.translated_text,
    });

  } catch (err) {
    console.error("Translation Error:", err);

    // FastAPI 연결 오류
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "번역 서버와 연결할 수 없습니다.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "번역 중 오류가 발생했습니다.",
      error: err.message,
    });
  }
};

// ======================================================
// EXPORT
// ======================================================
module.exports = {
  askRAG,
  translate,
};