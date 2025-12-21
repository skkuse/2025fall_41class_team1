import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ChatMessage from '../../components/Chat/ChatMessage'
import ChatInput from '../../components/Chat/ChatInput'
import BookmarkSidebar from '../../components/Chat/BookmarkSidebar'
import ScheduleSelectionModal from '../../components/Chat/ScheduleSelectionModal'

import {
    addMessage,
    clearAllBookmarks,
    clearSession,
    createNewSession,
    extractSchedulesFromConversation,
    generateAIResponseStream,
    getBookmarks,
    getCurrentSession,
    removeBookmark,
    saveSession,
    toggleMessageBookmark,
    updateMessage,
    updateMessageSources
} from '../../services/chatService'

import { addPrimaryScheduleItem, getPrimaryCalendarSchedules, getTimetable } from '../../services/myPageService' // Updated import
import { ChatMessage as ChatMessageType, ExtractedSchedule, Schedule, User, Timetable, Bookmark } from '../../types'
import { useUser } from '../../contexts/UserContext'
import logoImage from '../../assets/logo_nonbg.svg'

const normalizeType = (type?: string): Schedule['type'] => {
    if (type === 'academic' || type === 'personal' || type === 'subject') return type
    if (type === 'event') return 'event'
    return 'other'
}

export default function ChatPage() {
    const location = useLocation()
    const [messages, setMessages] = useState<ChatMessageType[]>([])
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
    const [isScheduleLoading, setIsScheduleLoading] = useState(false)
    const [scheduleCandidates, setScheduleCandidates] = useState<ExtractedSchedule[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const initialMessageSentRef = useRef(false)

    const { user, loading: userLoading } = useUser()
    const [userSchedules, setUserSchedules] = useState<Schedule[]>([])
    const [userTimetable, setUserTimetable] = useState<Timetable | null>(null)

    // ---------------------------
    // 사용자 정보 및 일정/시간표 로드
    // ---------------------------
    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                // 스케줄 로드
                const schedules = await getPrimaryCalendarSchedules()
                setUserSchedules(schedules)

                // 시간표 로드
                const timetable = await getTimetable()
                setUserTimetable(timetable)
            } else {
                setUserSchedules([])
                setUserTimetable(null)
            }
        }
        fetchUserData()
    }, [user])

    // ---------------------------
    // 북마크 로드 (userID 기반) + 세션 동기화
    // ---------------------------
    useEffect(() => {
        const fetchBookmarks = async () => {
            if (user) {
                const bookmarkList = await getBookmarks()
                setBookmarks(bookmarkList)

                // 세션의 isBookmarked와 bookmarkID 플래그를 DB 북마크와 동기화
                const session = getCurrentSession()
                if (session) {
                    let updated = false
                    session.messages.forEach(msg => {
                        if (msg.role === 'assistant') {
                            // DB에 이 메시지의 북마크가 있는지 bookmarkID로 확인
                            const matchedBookmark = bookmarkList.find(b => b.bookmarkID === msg.bookmarkID)
                            const isBookmarked = !!matchedBookmark

                            if (msg.isBookmarked !== isBookmarked) {
                                msg.isBookmarked = isBookmarked
                                updated = true
                            }

                            // bookmarkID가 없는데 DB에 있으면 동기화
                            if (!msg.bookmarkID && matchedBookmark) {
                                msg.bookmarkID = matchedBookmark.bookmarkID
                                updated = true
                            }

                            // bookmarkID가 있는데 DB에 없으면 제거
                            if (msg.bookmarkID && !matchedBookmark) {
                                msg.bookmarkID = undefined
                                updated = true
                            }
                        }
                    })
                    if (updated) {
                        saveSession(session)
                        setMessages([...session.messages])
                    }
                }
            } else {
                setBookmarks([])
            }
        }
        fetchBookmarks()
    }, [user])

    // ---------------------------
    // 세션 로드 + 초기 질문 처리
    // ---------------------------
    useEffect(() => {
        if (initialMessageSentRef.current) return

        let session = getCurrentSession()
        if (!session) session = createNewSession()

        const initialMessage = (location.state as any)?.initialMessage
        if (initialMessage) {
            initialMessageSentRef.current = true

            if (session.messages.length > 0) {
                clearSession()
                session = createNewSession()
            }

            setMessages([])

            setTimeout(() => {
                handleSendMessage(initialMessage)
            }, 100)

            window.history.replaceState({}, document.title)
        } else {
            setMessages(session.messages)
        }
    }, [location.state])

    // ---------------------------
    // 자동 스크롤
    // ---------------------------
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // ---------------------------
    // 메시지 전송 (스트리밍)
    // ---------------------------
    const handleSendMessage = async (content: string) => {
        // 1. 사용자 메시지 추가
        const userMessage = addMessage(content, 'user', 'text')
        setMessages(prev => [...prev, userMessage])

        // 2. 로딩 상태의 빈 AI 메시지 생성
        const aiMessage = addMessage('', 'assistant', 'markdown', true)
        setMessages(prev => [...prev, aiMessage])
        setIsLoading(true)

        let accumulatedText = ''

        try {
            await generateAIResponseStream(
                content,
                user,
                userSchedules,
                userTimetable,
                // onChunk: 실시간으로 텍스트 누적
                (chunk) => {
                    accumulatedText += chunk
                    updateMessage(aiMessage.id, accumulatedText, false)

                    // UI 업데이트 (로딩 해제 + 내용 업데이트)
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === aiMessage.id
                                ? { ...m, content: accumulatedText, isLoading: false }
                                : m
                        )
                    )
                },
                // onSources: 출처 정보 저장
                (sources) => {
                    console.log('Sources:', sources)
                    // UI 업데이트
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === aiMessage.id
                                ? { ...m, sources: sources }
                                : m
                        )
                    )
                    // localStorage에 저장
                    updateMessageSources(aiMessage.id, sources)
                },
                // onComplete: 완료 시
                () => {
                    console.log('Streaming completed')
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === aiMessage.id
                                ? { ...m, isLoading: false }
                                : m
                        )
                    )
                    setIsLoading(false)
                },
                // onError: 에러 시
                (error) => {
                    console.error('Stream error:', error)
                    updateMessage(aiMessage.id, '❌ 답변 생성 중 오류가 발생했습니다.')
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === aiMessage.id
                                ? { ...m, content: '❌ 답변 생성 중 오류가 발생했습니다.', isLoading: false }
                                : m
                        )
                    )
                    setIsLoading(false)
                }
            )
        } catch (error) {
            console.error('Error in handleSendMessage:', error)
            setMessages(prev =>
                prev.map(m =>
                    m.id === aiMessage.id
                        ? { ...m, isLoading: false }
                        : m
                )
            )
            setIsLoading(false)
        }
    }

    // ---------------------------
    // 번역 요청 (스트리밍)
    // ---------------------------
    const handleTranslate = async (content: string) => {
        const request = `Translate the following text to English:\n\n${content}`

        // 1. 로딩 상태의 빈 AI 메시지 생성 (번역 결과를 위함)
        const aiMessage = addMessage('', 'assistant', 'markdown', true)
        setMessages(prev => [...prev, aiMessage])
        setIsLoading(true)

        let accumulatedText = ''

        try {
            await generateAIResponseStream(
                request,
                user,
                userSchedules,
                userTimetable,
                // onChunk: 실시간으로 텍스트 누적
                (chunk) => {
                    accumulatedText += chunk
                    updateMessage(aiMessage.id, accumulatedText, false)

                    // UI 업데이트 (로딩 해제 + 내용 업데이트)
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === aiMessage.id
                                ? { ...m, content: accumulatedText, isLoading: false }
                                : m
                        )
                    )
                },
                // onSources: 출처 정보 저장 (번역에는 출처가 없을 수 있지만 구조 유지)
                (sources) => {
                    console.log('Sources for translation:', sources)
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === aiMessage.id
                                ? { ...m, sources: sources }
                                : m
                        )
                    )
                    updateMessageSources(aiMessage.id, sources)
                },
                // onComplete: 완료 시
                () => {
                    console.log('Translation streaming completed')
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === aiMessage.id
                                ? { ...m, isLoading: false }
                                : m
                        )
                    )
                    setIsLoading(false)
                },
                // onError: 에러 시
                (error) => {
                    console.error('Stream error during translation:', error)
                    const errorMessage = '❌ 번역 중 오류가 발생했습니다.'
                    updateMessage(aiMessage.id, errorMessage)
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === aiMessage.id
                                ? { ...m, content: errorMessage, isLoading: false }
                                : m
                        )
                    )
                    setIsLoading(false)
                }
            )
        } catch (error) {
            console.error('Error in handleTranslate:', error)
            const errorMessage = '❌ 번역 요청 중 오류가 발생했습니다.'
            updateMessage(aiMessage.id, errorMessage)
            setMessages(prev =>
                prev.map(m =>
                    m.id === aiMessage.id
                        ? { ...m, content: errorMessage, isLoading: false }
                        : m
                )
            )
            setIsLoading(false)
        }
    }

    // ---------------------------
    // 북마크 토글
    // ---------------------------
    const handleBookmark = async (messageId: string) => {
        await toggleMessageBookmark(messageId)

        // 세션 업데이트 (sources 유지)
        const session = getCurrentSession()
        if (session) {
            setMessages(prev =>
                session.messages.map(sessionMsg => {
                    const existingMsg = prev.find(m => m.id === sessionMsg.id)
                    return existingMsg?.sources
                        ? { ...sessionMsg, sources: existingMsg.sources }
                        : sessionMsg
                })
            )
        }

        // 북마크 목록 업데이트
        const updatedBookmarks = await getBookmarks()
        setBookmarks(updatedBookmarks)
    }

    // ---------------------------
    // 일정 추출
    // ---------------------------
    const handleScheduleExtract = async (messageId: string) => {
        const messageIndex = messages.findIndex(m => m.id === messageId)
        if (messageIndex <= 0) {
            alert('바로 앞의 질문과 답변이 필요합니다.')
            return
        }

        const question = messages[messageIndex - 1]?.content ?? ''
        const answer = messages[messageIndex]?.content ?? ''

        setIsScheduleModalOpen(true)
        setIsScheduleLoading(true)
        setScheduleCandidates([])

        try {
            const extracted = await extractSchedulesFromConversation(question, answer)
            setScheduleCandidates(extracted)
        } catch (error) {
            console.error('Error extracting schedules:', error)
            alert('일정 추출 중 오류가 발생했습니다.')
        } finally {
            setIsScheduleLoading(false)
        }
    }

    // ---------------------------
    // 일정 추가 확인
    // ---------------------------
    const handleScheduleConfirm = async (selected: ExtractedSchedule[]) => {
        if (selected.length === 0) {
            setIsScheduleModalOpen(false)
            return
        }

        setIsScheduleLoading(true)
        let successfulAdditions = 0

        for (const item of selected) {
            const type = normalizeType(item.type)
            try {
                await addPrimaryScheduleItem({
                    title: item.title,
                    date: item.startDate,
                    startDate: item.startDate,
                    endDate: item.endDate ?? item.startDate,
                    allDay: item.allDay ?? false,
                    description: item.description,
                    type,
                    location: item.location,
                    courseName: type === 'subject' ? item.title : undefined,
                    color: item.color,
                    sourceId: item.id
                })
                successfulAdditions++;
            } catch (error) {
                console.error('Failed to add extracted schedule:', item, error);
            }
        }

        if (successfulAdditions > 0) {
            alert(`${successfulAdditions}개의 일정이 캘린더에 추가되었습니다.`)
        } else {
            alert('일정 추가에 실패했습니다. 다시 시도해주세요.')
        }

        setIsScheduleLoading(false);
        setIsScheduleModalOpen(false)
        setScheduleCandidates([])
    }

    // ---------------------------
    // ---------------------------
    // 북마크 삭제
    // ---------------------------
    const handleRemoveBookmark = async (id: string) => {
        // id는 bookmarkID (string)
        const bookmarkIDToDelete = parseInt(id)

        // 세션에서 해당 bookmarkID를 가진 메시지 찾기
        const session = getCurrentSession()
        if (session) {
            const msg = session.messages.find(m => m.bookmarkID === bookmarkIDToDelete)
            if (msg) {
                await removeBookmark(msg.id)  // messageId로 삭제 (내부에서 세션 업데이트)
            }
        }

        // 북마크 목록 업데이트
        const updatedBookmarks = await getBookmarks()
        setBookmarks(updatedBookmarks)

        // removeBookmark가 세션을 업데이트했으므로 최신 세션 가져오기
        const updatedSession = getCurrentSession()
        if (updatedSession) {
            setMessages([...updatedSession.messages])
        }
    }

    // ---------------------------
    // 북마크 전체 삭제
    // ---------------------------
    const handleClearAllBookmarks = async () => {
        if (!window.confirm('모든 북마크를 삭제하시겠어요?')) return
        await clearAllBookmarks()
        setBookmarks([])  // 모두 삭제했으므로 빈 배열
        const session = getCurrentSession()
        if (session) setMessages([...session.messages])
    }

    // ---------------------------
    // New Chat
    // ---------------------------
    const handleNewChat = () => {
        clearSession()
        const session = createNewSession()
        setMessages(session.messages)
        setIsLoading(false)
        setScheduleCandidates([])
        setIsScheduleModalOpen(false)
        setIsScheduleLoading(false)
        initialMessageSentRef.current = false
    }

    const closeScheduleModal = () => {
        setIsScheduleModalOpen(false)
        setScheduleCandidates([])
        setIsScheduleLoading(false)
    }

    return (
        <div className="flex h-screen">
            {/* 메인 채팅 영역 */}
            <div className="flex-1 flex flex-col bg-gray-50">

                {/* Header */}
                <div className="bg-white border-b border-gray-200 h-[72px] px-6 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-800">채팅</h1>
                    <button
                        onClick={handleNewChat}
                        className="px-4 py-2 bg-askku-primary text-white rounded-lg font-medium hover:bg-askku-secondary transition-colors flex items-center gap-2"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        New Chat
                    </button>
                </div>

                {/* 메시지 영역 */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-20 h-20 rounded-full bg-askku-primary flex items-center justify-center mb-4">
                                <img src={logoImage} alt="ASKku Logo" className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">무엇을 도와드릴까요?</h2>
                            <p className="text-gray-500">학과와 관련된 정보 아무거나 물어보세요!</p>
                        </div>
                    ) : (
                        <>
                            <div className="max-w-4xl mx-auto">
                                <p className="text-center text-sm text-gray-500 mb-6">
                                    Chat with Assistant
                                </p>

                                {messages.map((msg) => (
                                    <ChatMessage
                                        key={msg.id}
                                        message={msg}
                                        onBookmark={handleBookmark}
                                        onTranslate={handleTranslate}
                                        onScheduleExtract={handleScheduleExtract}
                                    />
                                ))}
                            </div>

                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* 입력창 */}
                <ChatInput onSend={handleSendMessage} disabled={isLoading} />
            </div>

            {/* 북마크 사이드바 */}
            <BookmarkSidebar
                bookmarks={bookmarks}
                onRemove={handleRemoveBookmark}
                onClearAll={handleClearAllBookmarks}
            />

            {/* 일정 선택 모달 */}
            <ScheduleSelectionModal
                isOpen={isScheduleModalOpen}
                isLoading={isScheduleLoading}
                schedules={scheduleCandidates}
                onClose={closeScheduleModal}
                onConfirm={handleScheduleConfirm}
            />
        </div>
    )
}
