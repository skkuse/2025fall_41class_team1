import { useState } from 'react'
import { addTimetableItem } from '../../services/myPageService'
import { TimetableItem } from '../../types'

/**
 * 수업 추가 모달 컴포넌트
 * - 시간표에 새 과목 추가
 * - 과목명, 강의실, 요일, 시간, 색상 입력
 * - 시간 검증 (09:00~18:00)
 */

interface AddCourseModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (newItem: TimetableItem) => void
}

export default function AddCourseModal({ isOpen, onClose, onSuccess }: AddCourseModalProps) {
    const [courseName, setCourseName] = useState('')
    const [location, setLocation] = useState('')
    const [dayOfWeek, setDayOfWeek] = useState<'월' | '화' | '수' | '목' | '금'>('월')
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('10:30')
    const [alias, setAlias] = useState('')
    const [color, setColor] = useState('#DBEAFE')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null);

        if (!courseName || !location) {
            setError('과목명과 강의실을 모두 입력해주세요.');
            return;
        }

        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);

        if (startMinutes < 9 * 60) {
            setError('시작 시간은 오전 9시 이전으로 설정할 수 없습니다.');
            return;
        }
        if (endMinutes > 22 * 60) {
            setError('종료 시간은 오후 10시 이후로 설정할 수 없습니다.');
            return;
        }
        if (startMinutes >= endMinutes) {
            setError('시작 시간은 종료 시간보다 빨라야 합니다.');
            return;
        }

        setLoading(true)
        try {
            const newItemPayload = {
                courseName,
                location,
                dayOfWeek,
                startTime: `${startTime}:00`,
                endTime: `${endTime}:00`,
                alias,
                color,
            };

            const newItem = await addTimetableItem(newItemPayload as Omit<TimetableItem, 'itemID' | 'timetableID'>);

            setCourseName('')
            setLocation('')
            setDayOfWeek('월')
            setStartTime('09:00')
            setEndTime('10:30')
            setAlias('')
            setColor('#DBEAFE')

            onSuccess(newItem)
            onClose()

        } catch (err) {
            setError('수업 추가에 실패했습니다. 다시 시도해주세요.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const colors = [
        { label: 'Blue', value: '#DBEAFE' },
        { label: 'Green', value: '#DCFCE7' },
        { label: 'Purple', value: '#F3E8FF' },
        { label: 'Amber', value: '#FEF3C7' },
        { label: 'Red', value: '#FEE2E2' },
    ]

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">수업 추가</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">과목명</label>
                        <input
                            type="text"
                            name="courseName"
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                            placeholder="예: 데이터베이스개론"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">별칭 (선택)</label>
                        <input
                            type="text"
                            name="alias"
                            value={alias}
                            onChange={(e) => setAlias(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                            placeholder="예: 데베개"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">강의실</label>
                        <input
                            type="text"
                            name="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                            placeholder="예: 공학관 301호"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">요일</label>
                            <select
                                name="dayOfWeek"
                                value={dayOfWeek}
                                onChange={(e) => setDayOfWeek(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                            >
                                <option value="월">월요일</option>
                                <option value="화">화요일</option>
                                <option value="수">수요일</option>
                                <option value="목">목요일</option>
                                <option value="금">금요일</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">색상</label>
                        <div className="flex gap-2">
                            {colors.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setColor(c.value)}
                                    className={`w-8 h-8 rounded-full border-2 ${color === c.value ? 'border-gray-600' : 'border-transparent'}`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-askku-primary text-white rounded-lg hover:bg-askku-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '추가 중...' : '추가'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
