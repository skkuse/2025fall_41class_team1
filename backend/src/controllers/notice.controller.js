const fs = require("fs");
const path = require("path");

/**
 * 최신 공지사항 JSON 파일 경로
 * - RAG 크롤러/배치 작업에서 생성
 * - 서버는 읽기 전용으로 사용
 */
const LATEST_NOTICES_PATH = path.join(__dirname, "../rag/latest_notices.json");

// ======================================================
// GET LATEST NOTICES
// ======================================================

/**
 * 최신 공지사항 조회
 * - 파일 기반 데이터 제공 (DB 미사용)
 * - RAG 크롤링 결과를 그대로 반환
 */
const getLatestNotices = async (req, res) => {
  try {
    // --------------------------------------------------
    // 1. 파일 존재 여부 확인
    // --------------------------------------------------
    if (!fs.existsSync(LATEST_NOTICES_PATH)) {
      return res.status(404).json({
        success: false,
        message: "최신 공지사항 데이터를 찾을 수 없습니다. 크롤링을 먼저 실행해주세요.",
      });
    }

    // --------------------------------------------------
    // 2. 파일 읽기
    // --------------------------------------------------
    const data = fs.readFileSync(LATEST_NOTICES_PATH, "utf-8");

    /**
     * JSON 파싱
     * - 잘못된 형식일 경우 SyntaxError 발생
     */
    const latestNotices = JSON.parse(data);

    // --------------------------------------------------
    // 3. 응답 반환
    // --------------------------------------------------
    return res.json({
      success: true,
      notices: latestNotices,
    });

  } catch (err) {
    console.error("Get Latest Notices Error:", err);

    // JSON 파싱 오류
    if (err instanceof SyntaxError) {
      return res.status(500).json({
        success: false,
        message: "공지사항 데이터 형식이 올바르지 않습니다.",
      });
    }

    // 기타 서버 오류
    return res.status(500).json({
      success: false,
      message: "공지사항 조회 실패",
    });
  }
};

// ======================================================
// EXPORT
// ======================================================
module.exports = {
  getLatestNotices,
};