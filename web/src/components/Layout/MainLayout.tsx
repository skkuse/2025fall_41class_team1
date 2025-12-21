import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

/**
 * 메인 레이아웃 컴포넌트
 * - 사이드바 + 콘텐츠 영역 구조
 * - 홈 페이지는 상단 여백 추가
 */

interface MainLayoutProps {
    children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
    const location = useLocation()
    const isHomePage = location.pathname === '/home'

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col ml-64">
                <main className={`flex-1 overflow-auto ${isHomePage ? 'pt-[72px]' : ''}`}>
                    {children}
                </main>
            </div>
        </div>
    )
}
