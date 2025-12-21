import { Notice } from '../types'

// ======================================================
// LOCAL STORAGE UTILITIES (로그인 시간 및 공지 관리)
// ======================================================

const LAST_LOGIN_KEY = 'lastLoginTime'

/**
 * 마지막 로그인 시간 조회
 * - localStorage에서 ISO 문자열 형태로 저장된 시간 반환
 * - 없으면 null 반환
 */
export const getLastLoginTime = (): string | null => {
    return localStorage.getItem(LAST_LOGIN_KEY)
}

/**
 * 마지막 로그인 시간 저장
 * - 현재 시각을 ISO 문자열로 저장
 * - 파라미터 없이 호출 시 현재 시각 자동 저장
 */
export const setLastLoginTime = (time: string = new Date().toISOString()): void => {
    localStorage.setItem(LAST_LOGIN_KEY, time)
}

/**
 * 신규 공지사항 필터링
 * - 마지막 로그인 이후 등록된 공지만 반환
 * - 로그인 기록이 없으면 전체 공지 반환 (신규 사용자)
 */
export const getNewNotices = (notices: Notice[]): Notice[] => {
    const lastLogin = getLastLoginTime()

    if (!lastLogin) {
        return notices
    }

    const lastLoginDate = new Date(lastLogin)

    return notices.filter(notice => {
        const noticeDate = new Date(notice.date)
        return noticeDate > lastLoginDate
    })
}
