import { useState } from 'react'
import { ChatMessage as ChatMessageType } from '../../types'
import logoImage from '../../assets/logo_nonbg.svg'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkBreaks from 'remark-breaks'

/**
 * 채팅 메시지 컴포넌트
 * - 사용자/AI 메시지 렌더링
 * - 마크다운 지원 (리스트, 헤딩, 코드 블록 등)
 * - 북마크, 일정 추출, 번역, 출처 보기 기능
 * - 로딩 애니메이션
 */

interface ChatMessageProps {
    message: ChatMessageType
    onBookmark?: (messageId: string) => void
    onScheduleExtract?: (messageId: string) => void
    onTranslate?: (content: string) => void
}

export default function ChatMessage({ message, onBookmark, onScheduleExtract, onTranslate }: ChatMessageProps) {
    const isUser = message.role === 'user'
    const [showSources, setShowSources] = useState(false)

    const time = new Date(message.timestamp).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    })

    // 중복 제거된 출처 목록
    const uniqueSources =
        message.sources?.filter(
            (source, index, self) =>
                index === self.findIndex(s => JSON.stringify(s) === JSON.stringify(source))
        ) || []

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`flex gap-3 max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isUser && (
                    <div className="w-10 h-10 rounded-full bg-askku-primary flex items-center justify-center flex-shrink-0">
                        <img src={logoImage} alt="ASKku Bot" className="w-6 h-6 object-contain" />
                    </div>
                )}

                <div className="flex flex-col">
                    <div
                        className={`px-4 py-3 rounded-lg ${isUser
                            ? 'bg-askku-primary text-white'
                            : 'bg-gray-100 text-gray-800'
                            }`}
                    >
                        <div className={`text-sm markdown-content ${isUser ? 'text-white' : 'text-gray-800'}`}>
                            {/* 로딩 인디케이터 */}
                            {message.isLoading ? (
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                                </div>
                            ) : (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                    components={{
                                        ul: ({ node, ...props }) => (
                                            <ul className="list-disc list-outside space-y-1 my-2 pl-5" {...props} />
                                        ),
                                        ol: ({ node, ...props }) => (
                                            <ol className="list-decimal list-outside space-y-1 my-2 pl-5" {...props} />
                                        ),
                                        li: ({ node, ...props }) => (
                                            <li {...props} />
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
                                    {message.content}
                                </ReactMarkdown>
                            )}
                        </div>

                        {/* 출처 표시 */}
                        {!isUser && uniqueSources.length > 0 && showSources && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs font-semibold text-gray-600 mb-2">📚 참고 문서:</p>
                                <div className="space-y-2">
                                    {uniqueSources.map((source, idx) => (
                                        <div key={idx} className="text-xs bg-white p-2 rounded border border-gray-200">
                                            <p className="font-medium text-gray-700 mb-1">
                                                {source.title || `문서 ${idx + 1}`}
                                            </p>
                                            {source.url && (
                                                <a
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    링크열기
                                                </a>
                                            )}
                                            {source.snippet && (
                                                <p className="text-gray-600 mt-1 line-clamp-2">{source.snippet}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 하단 액션 버튼 */}
                    <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-gray-500">{time}</span>
                        {!isUser && onBookmark && (
                            <button
                                onClick={() => onBookmark(message.id)}
                                className={`text-xs px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 ${message.isBookmarked
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill={message.isBookmarked ? 'currentColor' : 'none'}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                                {message.isBookmarked ? '북마크됨' : '북마크'}
                            </button>
                        )}
                        {!isUser && onScheduleExtract && (
                            <button
                                onClick={() => onScheduleExtract(message.id)}
                                className="text-xs px-2 py-0.5 rounded transition-colors text-gray-500 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1"
                                title="일정 추출"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 1.99 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" fill="currentColor" />
                                </svg>
                                일정
                            </button>
                        )}
                        {!isUser && onTranslate && (
                            <button
                                onClick={() => onTranslate(message.content)}
                                className="text-xs px-2 py-0.5 rounded transition-colors text-gray-500 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                                </svg>
                                번역
                            </button>
                        )}
                        {!isUser && uniqueSources.length > 0 && (
                            <button
                                onClick={() => setShowSources(!showSources)}
                                className={`text-xs px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${showSources
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                                title="출처 보기"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                    <polyline points="10 9 9 9 8 9" />
                                </svg>
                                출처 ({uniqueSources.length})
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}