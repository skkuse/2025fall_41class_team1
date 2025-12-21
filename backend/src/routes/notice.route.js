const express = require("express");
const router = express.Router();

const {
  getLatestNotices,
} = require("../controllers/notice.controller");

// 최신 공지사항 조회 (인증 불필요 - 메인 페이지용)
router.get("/latest", getLatestNotices);

module.exports = router;