import { useState, useEffect } from 'react'
import { addPrimaryScheduleItem, getTimetable } from '../../services/myPageService'
import { TimetableItem, Schedule } from '../../types'

/**
 * 일정 추가 모달 컴포넌트
 * - 캘린더에 새 일정 추가
 * - 단일 날짜/기간지정 가능
 * - 과목 일정은 시간표에서 과목 선택
 */

interface AddScheduleModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function AddScheduleModal({ isOpen, onClose, onSuccess }: AddScheduleModalProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<Schedule['type']>('personal')
    const [color, setColor] = useState('#3B82F6')

    const [timetableItems, setTimetableItems] = useState<TimetableItem[]>([])
    const [isTimetableLoading, setIsTimetableLoading] = useState(false)
    const [selectedSubject, setSelectedSubject] = useState('')

    const [isDurationMode, setIsDurationMode] = useState(false)
    const [singleDate, setSingleDate] = useState('')
    const [multiStartDate, setMultiStartDate] = useState('')
    const [multiEndDate, setMultiEndDate] = useState('')

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            if (!isDurationMode) {
                setSingleDate(today);
                setMultiStartDate('');
                setMultiEndDate('');
            } else {
                setMultiStartDate(today);
                setMultiEndDate(today);
                setSingleDate('');
            }
        }
    }, [isOpen, isDurationMode]);


    useEffect(() => {
        const fetchItems = async () => {
            if (isOpen && type === 'subject') {
                setIsTimetableLoading(true);
                try {
                    const timetable = await getTimetable();
                    setTimetableItems(timetable.items || []);
                } catch (error) {
                    console.error("Failed to fetch timetable items for schedule modal", error);
                    setError('시간표 과목을 불러오는데 실패했습니다.');
                    setTimetableItems([]);
                } finally {
                    setIsTimetableLoading(false);
                }
            }
        };
        fetchItems();
    }, [isOpen, type]);

    if (!isOpen) return null

    const resetState = () => {
        setTitle('')
        setDescription('')
        setType('personal')
        setColor('#3B82F6')
        setSelectedSubject('')
        setTimetableItems([])
        setError(null);

        setIsDurationMode(false);
        const today = new Date().toISOString().split('T')[0];
        setSingleDate(today);
        setMultiStartDate('');
        setMultiEndDate('');
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null);

        let finalStartDate = '';
        let finalEndDate = '';

        if (!title) {
            setError('제목을 입력해주세요.');
            return;
        }

        if (!isDurationMode) {
            if (!singleDate) {
                setError('날짜를 입력해주세요.');
                return;
            }
            finalStartDate = singleDate;
            finalEndDate = singleDate;
        } else {
            if (!multiStartDate || !multiEndDate) {
                setError('시작일과 마감일을 모두 입력해주세요.');
                return;
            }
            if (new Date(multiStartDate) > new Date(multiEndDate)) {
                setError('마감일은 시작일보다 빠를 수 없습니다.');
                return;
            }
            finalStartDate = multiStartDate;
            finalEndDate = multiEndDate;
        }

        setLoading(true);

        const scheduleData: Omit<Schedule, 'itemID'> = {
            title,
            description,
            type,
            color,
            startDate: finalStartDate,
            endDate: finalEndDate,
            date: finalStartDate,
        }

        if (type === 'subject') {
            (scheduleData as any).courseName = selectedSubject
        }

        try {
            await addPrimaryScheduleItem(scheduleData);
            resetState()
            onSuccess()
            onClose()
        } catch (err) {
            console.error("Failed to add schedule:", err);
            setError('일정 추가에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">일정 추가</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                            placeholder="일정 제목을 입력하세요"
                            required
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                {isDurationMode ? '시작일' : '날짜'}
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsDurationMode(prev => !prev)}
                                className="text-xs text-askku-primary hover:text-askku-secondary transition-colors"
                            >
                                {isDurationMode ? '단일 날짜로 변경' : '기간 지정'}
                            </button>
                        </div>
                        <input
                            type="date"
                            value={isDurationMode ? multiStartDate : singleDate}
                            onChange={(e) => isDurationMode ? setMultiStartDate(e.target.value) : setSingleDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                            required
                        />
                    </div>
                    {isDurationMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">마감일</label>
                            <input
                                type="date"
                                value={multiEndDate}
                                onChange={(e) => setMultiEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                            placeholder="일정에 대한 설명을 입력하세요"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={type === 'personal'}
                                    onChange={() => setType('personal')}
                                    className="text-askku-primary focus:ring-askku-primary"
                                />
                                <span className="text-sm text-gray-700">개인 일정</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={type === 'academic'}
                                    onChange={() => setType('academic')}
                                    className="text-askku-primary focus:ring-askku-primary"
                                />
                                <span className="text-sm text-gray-700">학사 일정</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={type === 'subject'}
                                    onChange={() => setType('subject')}
                                    className="text-askku-primary focus:ring-askku-primary"
                                />
                                <span className="text-sm text-gray-700">과목 일정</span>
                            </label>
                        </div>
                    </div>

                    {type === 'subject' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">과목</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                                disabled={isTimetableLoading}
                            >
                                {isTimetableLoading ? (
                                    <option>과목 불러오는 중...</option>
                                ) : (
                                    <>
                                        <option value="">과목 없음</option>
                                        {timetableItems
                                            .filter(item => item && item.courseName && item.courseName.trim() !== '')
                                            .map((item) => (
                                                <option key={item.itemID} value={item.courseName}>
                                                    {item.courseName}
                                                </option>
                                            ))}
                                    </>
                                )}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">색상</label>
                        <div className="flex gap-2">
                            {['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'].map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-gray-600' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
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