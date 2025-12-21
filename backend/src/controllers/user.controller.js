const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Timetable } = require("../models");


// ======================================================
//                    REGISTER
// ======================================================

/**
 * 회원가입
 * - 이메일 중복 검사
 * - 비밀번호 bcrypt 해시 후 저장
 * - 기본 사용자 정보 생성
 */
const register = async (req, res) => {
  try {
    const { email, password, name, department, grade, additional_info, campus, admissionYear, semester } = req.body;

    // --------------------------------------------------
    // 1. 필수값 검증
    // --------------------------------------------------
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email과 password는 필수값입니다.",
      });
    }

    // --------------------------------------------------
    // 2. 이메일 중복 확인
    // --------------------------------------------------
    const existing = await User.findOne({ where: { email } });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "이미 가입된 이메일입니다.",
      });
    }

    // --------------------------------------------------
    // 3. 비밀번호 해싱
    // --------------------------------------------------
    const hash = await bcrypt.hash(password, 10);

    // --------------------------------------------------
    // 4. 사용자 생성
    // --------------------------------------------------
    const user = await User.create({
      email,
      password_hash: hash,
      name: name || null,
      department: department || null,
      grade: grade || null,
      additional_info: additional_info || null,
      campus: campus || null,
      admissionYear: admissionYear || null,
      semester: semester || null,
    });


    return res.status(201).json({
      success: true,
      message: "회원가입 완료",
      userID: user.userID,
    });

  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};


// ======================================================
//                      LOGIN
// ======================================================

/**
 * 로그인
 * - identifier(email) + password 검증
 * - 성공 시 JWT 발급
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // --------------------------------------------------
    // 1. 필수값 검증
    // --------------------------------------------------
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "identifier(email)와 password는 필수입니다.",
      });
    }

    // --------------------------------------------------
    // 2. 사용자 조회 (email 기준)
    // --------------------------------------------------
    const user = await User.findOne({
      where: { email: identifier },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // --------------------------------------------------
    // 3. 비밀번호 검증
    // --------------------------------------------------
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "비밀번호가 올바르지 않습니다.",
      });
    }

    // --------------------------------------------------
    // 4. JWT 발급
    // --------------------------------------------------
    const token = jwt.sign(
      { userID: user.userID },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "로그인 성공",
      token,
    });

  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};


// ======================================================
//              ADDITIONAL INFO UPDATE
// ======================================================

/**
 * 추가 정보 저장
 * - 회원가입 이후 선택 입력 정보 저장용
 */
const updateAdditionalInfo = async (req, res) => {
  try {
    const userID = req.user.userID;
    const { additionalInfo } = req.body;

    if (additionalInfo === undefined) {
      return res.status(400).json({
        success: false,
        message: "추가 정보(additionalInfo)가 필요합니다.",
      });
    }

    const user = await User.findByPk(userID);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    await user.update({ additional_info: additionalInfo });

    return res.json({
      success: true,
      message: "추가 정보가 저장되었습니다.",
      additional_info: user.additional_info,
    });

  } catch (err) {
    console.error("Update Additional Info Error:", err);
    return res.status(500).json({ success: false, message: "정보 저장 실패" });
  }
};


// ======================================================
//                   GET MY INFO
// ======================================================

/**
 * 내 정보 조회
 * - password_hash 제외
 */
const getMyInfo = async (req, res) => {
  try {
    const userID = req.user.userID;

    const user = await User.findByPk(userID, {
      attributes: { exclude: ["password_hash"] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    return res.json({
      success: true,
      user,
    });

  } catch (err) {
    console.error("Get My Info Error:", err);
    return res.status(500).json({ success: false, message: "정보 조회 실패" });
  }
};


// ======================================================
//                VERIFY PASSWORD
// ======================================================

/**
 * 비밀번호 재확인
 * - 민감 작업(개인정보 수정 등) 전 검증용
 */
const verifyPassword = async (req, res) => {
  try {
    const userID = req.user.userID;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "비밀번호를 입력해주세요.",
      });
    }

    const user = await User.findByPk(userID);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 비밀번호 확인
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(403).json({
        success: false,
        message: "비밀번호가 일치하지 않습니다.",
      });
    }

    return res.json({
      success: true,
      message: "비밀번호가 확인되었습니다.",
    });

  } catch (err) {
    console.error("Verify Password Error:", err);
    return res.status(500).json({ success: false, message: "서버 오류" });
  }
};


// ======================================================
//                UPDATE PROFILE
// ======================================================

/**
 * 개인정보 수정
 * - 이름, 학과, 학년 등 부분 업데이트
 * - 비밀번호 변경 시 재해싱
 */
const updateProfile = async (req, res) => {
  try {
    const userID = req.user.userID;
    const {
      name,
      department,
      campus,
      admissionYear,
      grade,
      semester,
      password  // 새 비밀번호 (선택 사항)
    } = req.body;

    const user = await User.findByPk(userID);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // --------------------------------------------------
    // 업데이트 데이터 구성
    // --------------------------------------------------
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (campus !== undefined) updateData.campus = campus;
    if (admissionYear !== undefined) updateData.admissionYear = admissionYear;
    if (grade !== undefined) updateData.grade = grade;
    if (semester !== undefined) updateData.semester = semester;

    // 비밀번호 변경 요청이 있는 경우
    if (password && password.length > 0) {
      // 비밀번호 해시
      const hash = await bcrypt.hash(password, 10);
      updateData.password_hash = hash;
    }

    // 사용자 정보 업데이트
    await user.update(updateData);

    // 업데이트된 정보 반환 (비밀번호 제외)
    const updatedUser = await User.findByPk(userID, {
      attributes: { exclude: ["password_hash"] },
    });

    return res.json({
      success: true,
      message: "개인정보가 성공적으로 수정되었습니다.",
      user: updatedUser,
    });

  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ success: false, message: "정보 수정 실패" });
  }
};


// ======================================================
// EXPORT
// ======================================================
module.exports = {
  register,
  login,
  updateAdditionalInfo,
  getMyInfo,
  verifyPassword,
  updateProfile,
};
