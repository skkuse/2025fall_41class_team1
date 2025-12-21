import { User } from '../types'
import bcrypt from 'bcryptjs'

// ======================================================
// LOCAL STORAGE KEYS
// ======================================================

/**
 * 사용자 기본 정보 저장용 key
 * - 이메일, 이름, 학번 등 비민감 정보만 저장
 */
const USERS_KEY = 'askku_users'

/**
 * 인증 토큰 저장용 key
 * - 실제 서비스에서는 HttpOnly Cookie 권장
 * - 현재는 프론트 단 Mock / 개발용
 */
const TOKEN_KEY = 'askku_token'

// ======================================================
// USER MANAGEMENT
// ======================================================

/**
 * 사용자 정보 저장
 * - 기존 사용자 목록을 불러온 뒤 새 사용자 추가
 * - localStorage에 전체 사용자 배열로 저장
 */
export const saveUser = (user: User): void => {
    const users = getAllUsers()
    users.push(user)
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

/**
 * 이메일 기준 사용자 조회
 * - 로그인, 중복 가입 체크 등에 사용
 */
export const getUserByEmail = (email: string): User | null => {
    const users = getAllUsers()
    return users.find(user => user.email === email) || null
}

/**
 * 사용자 ID 기준 사용자 조회
 * - 세션 복원, 사용자 상세 조회 등에 사용
 */
export const getUserById = (id: string): User | null => {
    const users = getAllUsers()
    return users.find(user => user.userID === id) || null
}


/**
 * 전체 사용자 목록 조회
 * - localStorage에 저장된 사용자 배열 반환
 * - 데이터가 없을 경우 빈 배열 반환
 */
export const getAllUsers = (): User[] => {
    const usersJson = localStorage.getItem(USERS_KEY)
    return usersJson ? JSON.parse(usersJson) : []
}

/**
 * 모든 인증/사용자 데이터 초기화
 * - 개발 환경에서 테스트 리셋 용도
 * - 운영 환경에서는 사용 금지
 */
export const clearAllData = (): void => {
    localStorage.removeItem(USERS_KEY)
    localStorage.removeItem('askku_passwords')
    localStorage.removeItem(TOKEN_KEY)
}

// ======================================================
// PASSWORD MANAGEMENT (SEPARATE STORAGE)
// ======================================================

/**
 * 비밀번호 저장용 key
 * - 사용자 정보와 분리 저장하여 책임 분리
 */
const PASSWORDS_KEY = 'askku_passwords'

/**
 * bcrypt salt round 수
 * - 숫자가 클수록 보안 ↑ / 성능 ↓
 * - 프론트 Mock 기준으로 10 설정
 */
const saltRounds = 10; // For bcrypt hashing

/**
 * 비밀번호 저장
 * - 평문 비밀번호는 절대 저장하지 않음
 * - bcrypt 해시 후 localStorage에 저장
 */
export const savePassword = (userId: string, password: string): void => {
    const passwords = getPasswords()
    // Hash the password before saving
    const hashedPassword = bcrypt.hashSync(password, saltRounds)
    passwords[userId] = hashedPassword
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords))
}

/**
 * 비밀번호 검증
 * - 입력된 비밀번호와 저장된 해시 비교
 * - bcrypt.compareSync 사용
 */
export const verifyPassword = (userId: string, password: string): boolean => {
    const passwords = getPasswords()
    const storedHash = passwords[userId]
    if (!storedHash) {
        return false // No password stored for this user
    }
    // Compare the provided password with the stored hash
    return bcrypt.compareSync(password, storedHash)
}

/**
 * 저장된 모든 비밀번호 해시 조회
 * - userId → hashedPassword 형태의 객체 반환
 */
const getPasswords = (): Record<string, string> => {
    const passwordsJson = localStorage.getItem(PASSWORDS_KEY)
    return passwordsJson ? JSON.parse(passwordsJson) : {}
}

// ======================================================
// TOKEN MANAGEMENT
// ======================================================

/**
 * 인증 토큰 저장
 * - JWT 또는 세션 토큰 저장
 */
export const saveToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token)
}


/**
 * 저장된 인증 토큰 조회
 */
export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY)
}

/**
 * 인증 토큰 제거 (로그아웃)
 */
export const removeToken = (): void => {
    localStorage.removeItem(TOKEN_KEY)
}
