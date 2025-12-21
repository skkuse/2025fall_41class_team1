import { useState } from 'react'
import { Bookmark } from '../../types'
import BookmarkDetailModal from './BookmarkDetailModal'

/**
 * 북마크 사이드바 컴포넌트
 * - 저장된 대화 목록 표시
 * - 북마크 클릭 시 상세 모달 열기
 * - 개별/전체 삭제 기능
 */

interface BookmarkSidebarProps {
    bookmarks: Bookmark[]
    onRemove: (id: string) => void
    onClearAll: () => void
}

export default function BookmarkSidebar({ bookmarks, onRemove, onClearAll }: BookmarkSidebarProps) {
    const [selectedBookmarkID, setSelectedBookmarkID] = useState<number | null>(null)

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp)
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const handleBookmarkClick = (bookmark: Bookmark) => {
        setSelectedBookmarkID(bookmark.bookmarkID || null)
    }

    return (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-gray-800">채팅 보관함</h2>
                    <span className="text-sm text-gray-500">{bookmarks.length}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {bookmarks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 text-gray-300">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <p className="text-sm">북마크된 대화가 없습니다</p>
                    </div>
                ) : (
                    bookmarks.map((bookmark) => (
                        <div
                            key={bookmark.id}
                            className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 group"
                            onClick={() => handleBookmarkClick(bookmark)}
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 flex-1">
                                    {bookmark.title}
                                </h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onRemove(bookmark.id)
                                    }}
                                    className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{bookmark.question || '질문 내용'}</p>
                            <span className="text-xs text-gray-500">{formatDate(bookmark.timestamp)}</span>
                        </div>
                    ))
                )}
            </div>

            {bookmarks.length > 0 && (
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={onClearAll}
                        className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        전체 삭제
                    </button>
                </div>
            )}

            {selectedBookmarkID && (
                <BookmarkDetailModal
                    isOpen={!!selectedBookmarkID}
                    onClose={() => setSelectedBookmarkID(null)}
                    bookmarkID={selectedBookmarkID}
                />
            )}
        </div>
    )
}