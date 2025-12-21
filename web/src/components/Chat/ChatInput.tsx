import { useState, KeyboardEvent } from 'react'

/**
 * 채팅 입력 컴포넌트
 * - 텍스트 입력 및 전송
 * - Enter: 전송 / Shift+Enter: 줄바꿈
 * - disabled 상태 지원 (AI 응답 대기 중)
 */

interface ChatInputProps {
    onSend: (message: string) => void
    disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [message, setMessage] = useState('')

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSend(message.trim())
            setMessage('')
        }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex items-end gap-3">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메시지를 입력하세요..."
                    disabled={disabled}
                    rows={1}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                <button
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    className="p-3 bg-askku-primary text-white rounded-lg hover:bg-askku-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>
        </div>
    )
}
