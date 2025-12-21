import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLatestNotices } from '../../services/noticeService'
import NoticeCard from '../../components/NoticeCard'
import { Notice } from '../../types'

export default function HomePage() {
    const navigate = useNavigate()
    const categories = ['수강신청', '학사일정', '장학금', '기숙사']

    // 최신 공지사항 6개
    const [latestNotices, setLatestNotices] = useState<Notice[]>([])

    useEffect(() => {
        const fetchNotices = async () => {
            const notices = await getLatestNotices();
            setLatestNotices(notices.slice(0, 6));
        };
        fetchNotices();
    }, []);

    // 빠른 채팅 입력
    const [quickMessage, setQuickMessage] = useState('')

    const handleQuickChat = (e: React.FormEvent) => {
        e.preventDefault()
        if (quickMessage.trim()) {
            navigate('/chat', { state: { initialMessage: quickMessage.trim() } })
        }
    }

    const handleCategoryClick = (category: string) => {
        navigate('/chat', { state: { initialMessage: category } })
    }

    return (
        <div className="max-w-6xl mx-auto p-8">
            {/* Title Section */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">성균관대 정보 검색</h1>
                <p className="text-gray-600">학사, 정보, 공지사항, 강의 정보를 검색해보세요</p>
            </div>

            {/* Quick Chat Input */}
            <div className="max-w-2xl mx-auto mb-8">
                <form onSubmit={handleQuickChat} className="relative">
                    <input
                        type="text"
                        value={quickMessage}
                        onChange={(e) => setQuickMessage(e.target.value)}
                        placeholder="챗봇에게 물어보세요..."
                        className="w-full px-6 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent text-lg"
                    />
                    <button
                        type="submit"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-askku-primary transition-colors"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </form>
            </div>

            {/* Category Tabs */}
            <div className="flex justify-center gap-4 mb-12">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => handleCategoryClick(category)}
                        className="px-6 py-2 rounded-full font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Latest Notices Section */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-6">최신 공지사항</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {latestNotices.map((notice) => (
                        <NoticeCard key={notice.id} notice={notice} />
                    ))}
                </div>

                
            </div>
        </div>
    )
}
