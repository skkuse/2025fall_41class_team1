import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import { User } from '../types';
import { getUserInfo } from '../services/authService';
import { clearSession } from '../services/chatService';

// ======================================================
// USER CONTEXT (전역 사용자 상태 관리)
// ======================================================

/**
 * UserContext 타입 정의
 * - user: 현재 로그인한 사용자 정보
 * - setUser: 사용자 정보 수동 설정 함수
 * - loading: 사용자 정보 로딩 상태
 * - fetchUser: 사용자 정보 재조회 함수
 */
interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    fetchUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
    children: ReactNode;
}

/**
 * UserProvider 컴포넌트
 * - 앱 전역에서 사용자 정보 제공
 * - 자동 로그인 상태 확인 (JWT 토큰 기반)
 * - 사용자 변경 시 채팅 세션 및 북마크 자동 초기화
 */
export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const previousUserId = useRef<string | null>(null);
    const hasInitialized = useRef<boolean>(false);

    /**
     * 사용자 정보 조회
     * - JWT 토큰 기반으로 /api/users/me 호출
     * - 성공 시 user 상태 업데이트
     * - 실패 시 null로 설정 (로그아웃 상태)
     */
    const fetchUser = useCallback(async () => {
        setLoading(true);
        try {
            const userData = await getUserInfo();
            setUser(userData);
        } catch (error) {
            console.error("Failed to fetch user:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // 컴포넌트 마운트 시 사용자 정보 자동 조회
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    /**
     * 사용자 변경 감지 및 세션 초기화
     * - 로그인 / 로그아웃 / 계정 전환 시에만 세션 클리어
     * - 첫 로딩(페이지 새로고침, 페이지 이동)에서는 세션 유지
     */
    useEffect(() => {
        // loading 중에는 체크하지 않음
        if (loading) return;

        const currentUserId = user?.userID || null;

        // 첫 로딩 완료 시: 세션을 유지하고 previousUserId만 설정
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            previousUserId.current = currentUserId;
            console.log(`First load completed. User ID: ${currentUserId}. Chat session preserved.`);
            return;
        }

        // 실제 사용자 변경인 경우에만 세션 클리어
        if (currentUserId !== previousUserId.current) {
            console.log(`User ID changed from ${previousUserId.current} to ${currentUserId}. Clearing chat session only.`);
            clearSession();  // 세션만 초기화, 북마크는 DB에 유지
            previousUserId.current = currentUserId;
        }
    }, [user, loading]);

    return (
        <UserContext.Provider value={{ user, setUser, loading, fetchUser }}>
            {children}
        </UserContext.Provider>
    );
};

/**
 * useUser 훅
 * - UserContext를 쉽게 사용하기 위한 커스텀 훅
 * - UserProvider 외부에서 사용 시 에러 발생
 */
export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
