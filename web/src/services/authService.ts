import api from '../api/axiosInstance';
import { RegisterData, AuthResponse, User } from '../types';

/**
 * 회원가입 요청 함수
 * - 이메일 형식 사전 검증 수행
 * - 서버에 회원가입 요청 전송
 * - 성공/실패 여부 및 메시지를 AuthResponse 형태로 반환
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
    // 이메일 형식 검증 (프론트 단에서 1차 검증)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
        return {
            success: false,
            message: '올바른 이메일 형식이 아닙니다'
        }
    }

    try {
        const res = await api.post('/api/users/register', {
            // 회원가입 API 호출
            email: data.email,
            password: data.password,
            name: `${data.lastName}${data.firstName}`, // 성 + 이름 결합
            campus: data.campus,
            department: data.department,
            admissionYear: data.admissionYear,
            grade: data.grade,
            semester: data.semester,
            additional_info: null
        });

        // 회원가입 성공 시 (토큰은 반환하지 않음)
        return {
            success: true,
            message: '회원가입이 완료되었습니다. 로그인해주세요.'
        };

    } catch (error: any) {
        // 서버 에러 메시지가 있으면 사용, 없으면 기본 메시지 반환
        return {
            success: false,
            message: error.response?.data?.message || '회원가입 실패'
        };
    }
}

/**
 * 로그인 요청 함수
 * - 이메일(identifier) + 비밀번호로 로그인 시도
 * - 로그인 성공 시 JWT 토큰을 localStorage에 저장
 * - 프론트 기존 AuthResponse 구조를 유지
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
        // 로그인 API 호출
        const res = await api.post('/api/users/login', {
            identifier: email, // 백엔드에서 identifier 필드 사용
            password
        });

        const token = res.data.token;

        // JWT 토큰 및 마지막 로그인 시각 저장
        localStorage.setItem('token', token);
        localStorage.setItem('lastLogin', new Date().toISOString());

        // 프론트 기존 login() 반환값을 그대로 유지
        return {
            success: true,
            token,
            message: '로그인 성공',
            // user 정보는 별도 API(/me) 호출로 가져오는 구조
            user: undefined
        };

    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || '로그인 실패'
        };
    }
};

/**
 * 로그아웃 함수
 * - localStorage에 저장된 인증 토큰 제거
 * - 서버 요청 없이 클라이언트 상태만 초기화
 */
export const logout = (): void => {
    localStorage.removeItem('token');
};

/**
 * 현재 로그인한 사용자 정보 조회
 * - localStorage의 토큰을 이용해 /me API 호출
 * - 성공 시 User 객체 반환
 * - 토큰 없거나 실패 시 null 반환
 */
export const getUserInfo = async (): Promise<User | null> => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const res = await api.get('/api/users/me', {
            headers: { Authorization: `Bearer ${token}` }
        });

        return res.data.user as User;

    } catch {
        return null;
    }
};

/**
 * 인증 여부 확인 함수
 * - 토큰 존재 여부 + /me API 정상 응답 여부로 인증 상태 판단
 * - true: 인증됨 / false: 인증되지 않음
 */
export const isAuthenticated = async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        await api.get('/api/users/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return true;

    } catch {
        return false;
    }
};

/**
 * 비밀번호 재확인 함수
 * - 민감한 작업(개인정보 수정, 탈퇴 등) 전 비밀번호 검증 용도
 * - 현재 로그인 상태에서만 호출 가능
 */
export const verifyPassword = async (password: string): Promise<AuthResponse> => {
    const token = localStorage.getItem('token');
    if (!token) {
        return {
            success: false,
            message: '로그인이 필요합니다.'
        };
    }

    try {
        const res = await api.post('/api/users/verify-password',
            { password },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        return {
            success: true,
            message: res.data.message || '비밀번호가 확인되었습니다.'
        };

    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || '비밀번호가 일치하지 않습니다.'
        };
    }
};

/**
 * 개인정보 수정 함수
 * - 이름, 학과, 캠퍼스, 학년, 학기, 비밀번호 등 선택적 수정 가능
 * - 변경된 사용자 정보는 서버 응답으로 반환
 */
export const updateProfile = async (profileData: {
    name?: string;
    department?: string;
    campus?: string;
    admissionYear?: number;
    grade?: number;
    semester?: number;
    password?: string;
}): Promise<AuthResponse> => {
    const token = localStorage.getItem('token');
    if (!token) {
        return {
            success: false,
            message: '로그인이 필요합니다.'
        };
    }

    try {
        const res = await api.put('/api/users/profile', profileData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return {
            success: true,
            message: res.data.message || '개인정보가 수정되었습니다.',
            user: res.data.user
        };

    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || '개인정보 수정 실패'
        };
    }
};
