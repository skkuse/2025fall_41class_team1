import DOMPurify from "dompurify"
import { ChatMessage, ChatSession, Bookmark, ExtractedSchedule, User, Schedule, Timetable } from '../types'
import api from '../api/axiosInstance'

// localStorage key 상수
const CHAT_SESSION_KEY = 'askku_chat_session'

// ------------------------------
// CHAT SESSION MANAGEMENT
// ------------------------------

/**
 * 새로운 채팅 세션 생성
 * - 고유 session id 생성
 * - 메시지 배열 초기화
 * - 생성 시각 기록
 * - localStorage에 즉시 저장
 */
export const createNewSession = (): ChatSession => {
    const session: ChatSession = {
        id: `session_${Date.now()}`,
        messages: [],
        createdAt: new Date().toISOString()
    }
    saveSession(session)
    return session
}

/**
 * 현재 채팅 세션 조회
 * - localStorage에서 세션 불러오기
 * - 없으면 null 반환
 */
export const getCurrentSession = (): ChatSession | null => {
    const json = localStorage.getItem(CHAT_SESSION_KEY)
    return json ? JSON.parse(json) : null
}

/**
 * 채팅 세션 저장
 * - session 객체를 JSON으로 직렬화하여 localStorage에 저장
 */
export const saveSession = (session: ChatSession): void => {
    localStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(session))
}

/**
 * 채팅 세션 초기화
 * - localStorage에서 현재 세션 제거
 */
export const clearSession = (): void => {
    localStorage.removeItem(CHAT_SESSION_KEY)
}

// ------------------------------
// MESSAGE MANAGEMENT
// ------------------------------

/**
 * 메시지 추가
 * - 사용자 / AI 메시지 공통 처리
 * - 세션이 없으면 새 세션 생성
 * - 메시지 생성 후 세션에 push
 */
export const addMessage = (
    content: string,
    role: 'user' | 'assistant',
    format: 'text' | 'markdown' | 'sources' = 'text',
    isLoading?: boolean
): ChatMessage => {

    let session = getCurrentSession()
    if (!session) session = createNewSession()

    const message: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random()}`,
        role,
        content,
        timestamp: new Date().toISOString(),
        isBookmarked: false,
        format,
        isLoading: isLoading ?? false
    }

    session.messages.push(message)
    saveSession(session)

    return message
}

/**
 * 메시지 업데이트 (스트리밍 응답용)
 * - 특정 messageId의 content를 실시간으로 갱신
 * - isLoading 상태도 함께 제어 가능
 */
export const updateMessage = (messageId: string, content: string, isLoading?: boolean): void => {
    const session = getCurrentSession()
    if (!session) return

    const message = session.messages.find(m => m.id === messageId)
    if (message) {
        message.content = content
        if (isLoading !== undefined) {
            message.isLoading = isLoading
        }
        saveSession(session)
    }
}

/**
 * 메시지 출처 정보 업데이트
 * - RAG 응답에서 반환된 sources 저장
 */
export const updateMessageSources = (messageId: string, sources: any[]): void => {
    const session = getCurrentSession()
    if (!session) return

    const message = session.messages.find(m => m.id === messageId)
    if (message) {
        message.sources = sources
        saveSession(session)
    }
}

// ------------------------------
// CLEAN MARKDOWN
// ------------------------------

/**
 * 마크다운 / HTML 정제 함수
 * - 줄바꿈 통일
 * - DOMPurify를 사용해 XSS 방지
 */
const cleanMarkdown = (text: string): string => {
    if (!text) return "";
    return DOMPurify.sanitize(text.replace(/\r\n/g, "\n").trim(), {
        USE_PROFILES: { html: true }
    });
};

// ------------------------------
// AI RESPONSE (STREAMING)
// ------------------------------

/**
 * AI 응답 스트리밍 처리
 * - Fetch API + ReadableStream 사용
 * - SSE 형식(data: {...}) 이벤트 파싱
 * - content / sources / done 이벤트 분리 처리
 */
export const generateAIResponseStream = async (
    userMessage: string,
    user: User | null,
    userSchedules: Schedule[],
    userTimetable: Timetable | null,
    onChunk: (chunk: string) => void,
    onSources?: (sources: any[]) => void,
    onComplete?: () => void,
    onError?: (error: string) => void
): Promise<void> => {

    try {
        let session = getCurrentSession()
        if (!session) session = createNewSession()

        // 최근 대화 히스토리 (최대 10개)
        const recentHistory = session.messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
        }))

        // RAG 서버 엔드포인트
        const baseURL = 'http://localhost:4000'
        const url = `${baseURL}/api/rag/ask`

        // JWT 토큰 확인
        const token = localStorage.getItem('token')
        if (!token) {
            throw new Error('로그인이 필요합니다.')
        }

        // 스트리밍 요청
        const response = await fetch(
            url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // ✅ JWT 필수
                },
                body: JSON.stringify({
                    message: userMessage,
                    history: recentHistory,
                    isFirstQuestion: session.messages.length === 0
                })
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[DEBUG] Response not OK:', response.status, errorText)
            throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
            throw new Error('No reader available')
        }

        let buffer = ''

        // 스트리밍 루프
        while (true) {
            const { done, value } = await reader.read()

            if (done) break

            buffer += decoder.decode(value, { stream: true })

            // SSE 형식 파싱: "data: {...}\n\n"
            const lines = buffer.split('\n\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue

                try {
                    const jsonStr = line.replace('data: ', '').trim()
                    const event = JSON.parse(jsonStr)

                    if (event.type === 'sources') {
                        if (onSources) onSources(event.sources)
                    }
                    else if (event.type === 'content') {
                        onChunk(event.content)
                    }
                    else if (event.type === 'done') {
                        if (onComplete) onComplete()
                    }
                    else if (event.type === 'error') {
                        throw new Error(event.message)
                    }
                } catch (e) {
                    console.error('Parse error:', e, line)
                }
            }
        }

    } catch (e) {
        console.error('[DEBUG] AI Response Stream Error:', e)
        if (onError) {
            onError('답변 생성 중 오류가 발생했습니다.')
        }
    }
}

/**
 * 기존 non-streaming 방식 (호환성 유지)
 * - 내부적으로 streaming API 사용
 * - 모든 chunk를 합쳐서 최종 응답 반환
 */
export const generateAIResponse = async (
    userMessage: string
): Promise<{ text: string; format: 'markdown' | 'sources' | 'text' }> => {

    return new Promise((resolve, reject) => {
        let fullText = ''

        generateAIResponseStream(
            userMessage,
            null, // User data not available in this simplified call
            [],   // Schedules data not available
            null, // Timetable data not available
            (chunk) => {
                fullText += chunk
            },
            undefined,
            () => {
                resolve({
                    text: cleanMarkdown(fullText),
                    format: 'markdown'
                })
            },
            (error) => {
                reject(new Error(error))
            }
        )
    })
}

// ------------------------------
// BOOKMARKS (SERVER + LOCAL)
// ------------------------------

/**
 * DB에서 북마크 목록 조회 (userID 기반)
 */
export const getBookmarks = async (): Promise<Bookmark[]> => {
    try {
        const res = await api.get('/api/bookmarks')
        if (!res.data.success) return []

        // 백엔드 응답을 프론트엔드 Bookmark 타입으로 변환
        return res.data.bookmarks.map((b: any) => ({
            id: b.bookmarkID.toString(),  // UI에서 사용할 ID
            bookmarkID: b.bookmarkID,     // DB ID
            title: b.title,
            question: '',  // 목록에서는 필요 없음
            answer: '',    // 목록에서는 필요 없음
            sources: null,
            timestamp: b.createdAt
        }))
    } catch (err) {
        console.error('Get Bookmarks Error:', err)
        return []
    }
}

/**
 * 북마크 상세 조회
 * - DB에서 bookmarkID로 question/answer 등 전체 정보 조회
 */
export const getBookmarkDetail = async (bookmarkID: number): Promise<Bookmark | null> => {
    try {
        const res = await api.get(`/api/bookmarks/${bookmarkID}`)
        if (!res.data.success) return null

        const b = res.data.bookmark
        return {
            id: b.bookmarkID.toString(),
            bookmarkID: b.bookmarkID,
            title: b.title,
            question: b.question,
            answer: b.answer,
            sources: b.sources,
            timestamp: b.createdAt
        }
    } catch (err) {
        console.error('Get Bookmark Detail Error:', err)
        return null
    }
}

/**
 * 북마크 추가
 * - DB에 북마크 저장
 */
export const addBookmark = async (
    messageId: string,  // 세션 메시지 ID (북마크 표시용)
    question: string,
    answer: string
): Promise<Bookmark | null> => {
    try {
        const res = await api.post('/api/bookmarks', {
            question,
            answer,
        })

        if (!res.data.success) return null

        // 백엔드 응답에서 데이터 매핑
        const newBookmark: Bookmark = {
            id: messageId,  // 세션에서 사용하는 메시지 ID
            bookmarkID: res.data.bookmark.bookmarkID,  // DB ID
            title: res.data.bookmark.title,
            question: res.data.bookmark.question || question,
            answer: res.data.bookmark.answer || answer,
            sources: res.data.bookmark.sources,
            timestamp: res.data.bookmark.createdAt || new Date().toISOString()
        }

        // 세션에 bookmarkID 저장
        const session = getCurrentSession()
        if (session) {
            const msg = session.messages.find(m => m.id === messageId)
            if (msg) {
                msg.bookmarkID = res.data.bookmark.bookmarkID
                saveSession(session)
            }
        }

        return newBookmark
    } catch (err) {
        console.error('Bookmark API Error:', err)
        return null
    }
}

/**
 * 북마크 삭제
 * - 세션의 bookmarkID로 DB에서 삭제
 * - 세션의 isBookmarked 및 bookmarkID 초기화
 */
export const removeBookmark = async (messageId: string): Promise<void> => {
    const session = getCurrentSession()
    if (!session) return

    const msg = session.messages.find(m => m.id === messageId)
    if (!msg) return

    // bookmarkID로 삭제
    const bookmarkIdToDelete = msg.bookmarkID
    if (bookmarkIdToDelete) {
        try {
            await api.delete(`/api/bookmarks/${bookmarkIdToDelete}`)
            msg.isBookmarked = false
            msg.bookmarkID = undefined  // bookmarkID 제거
            saveSession(session)
        } catch (err) {
            console.error('Remove Bookmark Error:', err)
        }
    }
}

/**
 * 메시지 북마크 토글
 * - assistant 메시지만 북마크 가능
 * - user 질문 + assistant 답변 쌍으로 저장
 * - 세션의 bookmarkID 기반으로 토글
 */
export const toggleMessageBookmark = async (messageId: string): Promise<void> => {
    const session = getCurrentSession()
    if (!session) return

    const msg = session.messages.find(m => m.id === messageId)
    if (!msg || msg.role !== "assistant") return

    const idx = session.messages.findIndex(m => m.id === messageId)
    const userMsg = session.messages[idx - 1]

    // 세션의 bookmarkID 확인
    if (msg.bookmarkID) {
        // 이미 북마크되어 있으면 삭제
        await removeBookmark(messageId)
        msg.isBookmarked = false
        msg.bookmarkID = undefined
    } else {
        // 북마크되어 있지 않으면 추가
        if (userMsg) {
            const bookmark = await addBookmark(messageId, userMsg.content, msg.content)
            if (bookmark) {
                msg.isBookmarked = true
                msg.bookmarkID = bookmark.bookmarkID
            }
        }
    }

    saveSession(session)
}

/**
 * 모든 북마크 삭제
 * - DB에서 일괄 삭제 + 세션 상태 정리
 */
export const clearAllBookmarks = async (): Promise<void> => {
    try {
        const bookmarks = await getBookmarks()

        // DB에서 모두 삭제
        await Promise.all(
            bookmarks
                .filter(b => b.bookmarkID)  // bookmarkID가 있는 것만
                .map(b => api.delete(`/api/bookmarks/${b.bookmarkID}`))
        )

        // 세션 플래그 클리어
        const session = getCurrentSession()
        if (session) {
            session.messages.forEach(m => {
                if (m.isBookmarked) m.isBookmarked = false
            })
            saveSession(session)
        }
    } catch (err) {
        console.error('Clear All Bookmarks Error:', err)
        throw err
    }
}

// ------------------------------
// SCHEDULE EXTRACTION
// ------------------------------

/**
 * 대화 기반 일정 추출
 * - 질문 + 답변을 서버로 전달
 * - 추출된 일정 목록 반환
 * - 프론트에서 사용할 고유 ID 부여
 */
export const extractSchedulesFromConversation = async (
    question: string,
    answer: string
): Promise<ExtractedSchedule[]> => {

    try {
        const res = await api.post("/api/schedule/extract", { question, answer })

        if (!res.data.success) return []

        // 각 일정에 고유 ID 부여 (백엔드 ID가 없거나 중복될 수 있으므로)
        const schedules = res.data.schedules.map((schedule: ExtractedSchedule, index: number) => ({
            ...schedule,
            id: `schedule_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`
        }))

        return schedules

    } catch (e) {
        console.error("Schedule Extract Error:", e)
        return []
    }
}
