import axios from 'axios';

// ======================================================
// AXIOS INSTANCE (공통 API 클라이언트)
// ======================================================

/**
 * Axios 인스턴스 생성
 * - baseURL: 백엔드 서버 주소
 */
const api = axios.create({
    baseURL: 'http://localhost:4000',
    withCredentials: false,
});

/**
 * 요청 인터셉터
 * - 모든 API 요청에 JWT 토큰 자동 추가
 * - localStorage에서 토큰 읽어 Authorization 헤더에 설정
 */
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * 응답 인터셉터
 * - 401 Unauthorized 응답 시 자동 로그아웃 및 로그인 페이지로 리디렉트
 * - 세션 만료 등의 인증 오류 자동 처리
 */
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // 토큰 삭제
            localStorage.removeItem('token');

            // 로그인 페이지로 리디렉트
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
