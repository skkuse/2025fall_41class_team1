import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkBreaks from 'remark-breaks'
import { getBookmarkDetail } from '../../services/chatService'
import { Bookmark } from '../../types'

/**
 * 북마크 상세 모달 컴포넌트
 * - 저장된 질문/답변 전체 내용 표시
 * - 마크다운 렌더링 지원
 * - 외부 클릭 시 닫기
 */

interface BookmarkDetailModalProps {
    isOpen: boolean
    onClose: () => void
    bookmarkID: number | null
}

export default function BookmarkDetailModal({
    isOpen,
    onClose,
    bookmarkID
}: BookmarkDetailModalProps) {
    const modalRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(false)
    const [bookmark, setBookmark] = useState<Bookmark | null>(null)

    // 북마크 상세 정보 로딩
    useEffect(() => {
        const fetchBookmarkDetail = async () => {
            if (!bookmarkID) return

            setLoading(true)
            const detail = await getBookmarkDetail(bookmarkID)
            setBookmark(detail)
            setLoading(false)
        }

        if (isOpen && bookmarkID) {
            fetchBookmarkDetail()
        }
    }, [isOpen, bookmarkID])

    // 외부 클릭 시 모달 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] overflow-hidden animate-fade-in-up flex flex-col"
            >
                <div className="bg-askku-primary px-6 py-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                        {loading ? '로딩 중...' : bookmark?.title || '북마크'}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-askku-primary"></div>
                        </div>
                    ) : !bookmark ? (
                        <div className="text-center py-12 text-gray-500">
                            <p>북마크를 불러올 수 없습니다.</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <h3 className="font-bold text-gray-800">질문</h3>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <p className="text-gray-700 whitespace-pre-wrap">{bookmark.question}</p>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-askku-primary flex items-center justify-center flex-shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-bold text-gray-800">답변</h3>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="text-gray-700 prose prose-sm max-w-none markdown-content">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkBreaks]}
                                            rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                            components={{
                                                ul: ({ node, ...props }) => (
                                                    <ul className="list-disc list-inside space-y-1 my-2" {...props} />
                                                ),
                                                ol: ({ node, ...props }) => (
                                                    <ol className="list-decimal list-inside space-y-1 my-2" {...props} />
                                                ),
                                                li: ({ node, ...props }) => (
                                                    <li className="ml-2" {...props} />
                                                ),
                                                h1: ({ node, ...props }) => (
                                                    <h1 className="text-xl font-bold mt-4 mb-2" {...props} />
                                                ),
                                                h2: ({ node, ...props }) => (
                                                    <h2 className="text-lg font-bold mt-3 mb-2" {...props} />
                                                ),
                                                h3: ({ node, ...props }) => (
                                                    <h3 className="text-base font-bold mt-2 mb-1" {...props} />
                                                ),
                                                code: ({ node, inline, ...props }: any) => (
                                                    inline
                                                        ? <code className="bg-gray-200 px-1 py-0.5 rounded text-sm" {...props} />
                                                        : <code className="block bg-gray-200 p-2 rounded my-2 text-sm" {...props} />
                                                ),
                                                strong: ({ node, ...props }) => (
                                                    <strong className="font-bold" {...props} />
                                                ),
                                                a: ({ node, ...props }) => (
                                                    <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                                                ),
                                                p: ({ node, ...props }) => (
                                                    <p className="my-1" {...props} />
                                                )
                                            }}
                                        >
                                            {bookmark.answer}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-askku-primary text-white rounded-lg hover:bg-askku-secondary transition-colors font-medium"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    )
}