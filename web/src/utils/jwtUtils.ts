const SECRET_KEY = 'askku-secret-key-2025'

/**
 * JWT 토큰 생성 (데모용)
 * - Header + Payload + Signature 형식
 * - 24시간 만료 시간 설정
 */
export const generateToken = (payload: any): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }))
    const signature = btoa(`${header}.${body}.${SECRET_KEY}`)

    return `${header}.${body}.${signature}`
}

/**
 * JWT 토큰 디코딩
 * - Base64 디코딩하여 payload 추출
 * - 실패 시 null 반환
 */
export const decodeToken = (token: string): any => {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null

        const payload = JSON.parse(atob(parts[1]))
        return payload
    } catch (error) {
        return null
    }
}

/**
 * JWT 토큰 유효성 검증
 * - 디코딩 가능 여부 확인
 * - 만료 시간(exp) 체크
 */
export const verifyToken = (token: string): boolean => {
    try {
        const payload = decodeToken(token)
        if (!payload) return false

        if (payload.exp && payload.exp < Date.now()) {
            return false
        }

        return true
    } catch (error) {
        return false
    }
}
