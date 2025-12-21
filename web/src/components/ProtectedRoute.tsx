import { Navigate } from 'react-router-dom'

/**
 * 인증 보호 라우트 컴포넌트
 * - 로그인한 사용자만 접근 가능 (토큰 존재 여부 체크)
 * - 미인증 시 로그인 페이지로 리디렉트
 * - API 호출 시 401 응답은 axios 인터셉터에서 처리
 */

interface ProtectedRouteProps {
    children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/" replace />
    }

    return <>{children}</>
}
