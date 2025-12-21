const jwt = require("jsonwebtoken");
const { User } = require("../models");

/**
 * JWT 인증 미들웨어
 * - Authorization 헤더의 Bearer 토큰 검증
 * - 토큰이 유효하면 사용자 정보를 req.user에 주입
 * - 보호된 API 라우트에서 공통으로 사용
 */
async function authMiddleware(req, res, next) {
  /**
   * Authorization 헤더 형식:
   * Authorization: Bearer <JWT_TOKEN>
   */
  const auth = req.headers.authorization;

  // Authorization 헤더가 없거나 Bearer 형식이 아닐 경우
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "토큰 없음" });
  }

  // "Bearer <token>" 에서 실제 토큰만 추출
  const token = auth.split(" ")[1].trim();

  try {
    /**
     * JWT 검증
     * - 서명 검증 + 만료(exp) 확인
     * - 실패 시 예외 발생
     */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * JWT payload에서 userID 추출
     * - 토큰에는 최소 정보(userID)만 포함
     * - 실제 사용자 정보는 DB에서 조회
     */
    const user = await User.findByPk(decoded.userID, {
      // 민감 정보 제외 (보안)
      attributes: { exclude: ["password_hash"] },
    });

    // 토큰은 유효하지만 사용자 정보가 없는 경우
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "유효하지 않은 사용자",
      });
    }

    /**
     * 인증된 사용자 정보를 request 객체에 주입
     * - 이후 컨트롤러에서 req.user로 접근 가능
     */
    req.user = user;

    // 다음 미들웨어 / 컨트롤러로 전달
    next();

  } catch (err) {
    /**
     * JWT 검증 실패 케이스
     * - 토큰 만료
     * - 서명 불일치
     * - 변조된 토큰
     */
    console.error("JWT ERROR:", err.message);
    res.status(401).json({ success: false, message: "인증 실패" });
  }
}

module.exports = authMiddleware;
