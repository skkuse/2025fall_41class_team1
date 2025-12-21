import { useEffect, useState, useCallback } from 'react'
import { Schedule } from '../../types'
import { deleteScheduleItem, getPrimaryCalendarSchedules } from '../../services/myPageService'

/**
 * 캘린더 뷰 컴포넌트
 * - 월별 캘린더 형식으로 일정 표시
 * - 여러 날짜에 걸친 일정 지원 (시작일/마감일 표시)
 */

interface CalendarViewProps {
    onAddClick: () => void
    onScheduleClick: (schedule: Schedule) => void
    refreshTrigger: number
}

// 시간 포맷 헬퍼 (HH:mm)
const formatTime = (timeStr: string | undefined): string => {
    if (!timeStr) return '';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    const match = timeStr.match(/T(\d{2}:\d{2})/)
    return match ? match[1] : timeStr;
};


export default function CalendarView({ onAddClick, onScheduleClick, refreshTrigger }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [allSchedules, setAllSchedules] = useState<Schedule[]>([])
    const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([])
    const [selectedType, setSelectedType] = useState<'all' | 'personal' | 'academic' | 'course'>('all')

    // API에서 모든 일정 가져오기
    const fetchAllSchedules = useCallback(async () => {
        try {
            const schedulesFromApi = await getPrimaryCalendarSchedules();
            setAllSchedules(schedulesFromApi);
        } catch (error) {
            console.error("Failed to fetch all schedules:", error);
            setAllSchedules([]);
        }
    }, []);

    useEffect(() => {
        fetchAllSchedules();
    }, [fetchAllSchedules, refreshTrigger]);

    // 선택된 타입에 따라 일정 필터링
    useEffect(() => {
        if (selectedType === 'all') {
            setFilteredSchedules(allSchedules);
        } else {
            setFilteredSchedules(allSchedules.filter(s => s.type === (selectedType === 'course' ? 'subject' : selectedType)));
        }
    }, [allSchedules, selectedType]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay()
    }

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const handleDeleteSchedule = async (itemID: string, e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await deleteScheduleItem(itemID);
            fetchAllSchedules();
        } catch (error) {
            console.error("Failed to delete schedule:", error);
        }
    }

    const renderCalendar = () => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const daysInMonth = getDaysInMonth(year, month)
        const firstDay = getFirstDayOfMonth(year, month)
        const days = []

        // 이전 달 빈 칸
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-32 border-b border-r border-gray-100 bg-gray-50/30"></div>)
        }

        // 현재 달 날짜들
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`


            const daySchedules = filteredSchedules.filter(s => {
                const startDate = s.startDate || s.date;
                const endDate = s.endDate || startDate;
                const formattedStartDate = startDate ? startDate.substring(0, 10) : '';
                const formattedEndDate = endDate ? endDate.substring(0, 10) : '';

                if (formattedStartDate === formattedEndDate) {
                    return dateStr === formattedStartDate;
                } else {
                    return dateStr === formattedStartDate || dateStr === formattedEndDate;
                }
            });

            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()

            days.push(
                <div key={day} className={`h-32 border-b border-r border-gray-100 p-2 relative group hover:bg-gray-50 transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}>
                    <span className={`text-sm font-medium ${isToday ? 'text-askku-primary bg-blue-100 px-2 py-0.5 rounded-full' : 'text-gray-700'}`}>
                        {day}
                    </span>
                    <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                        {daySchedules.map(schedule => {
                            const startDate = schedule.startDate || schedule.date;
                            const endDate = schedule.endDate || startDate;
                            const formattedStartDate = startDate ? startDate.substring(0, 10) : '';
                            const formattedEndDate = endDate ? endDate.substring(0, 10) : '';

                            let displayTitle = schedule.title;
                            let displayDescription = schedule.description || '';

                            if (formattedStartDate !== formattedEndDate) {
                                if (dateStr === formattedStartDate) {
                                    displayTitle += ' 시작일';
                                    if (schedule.startTime) {
                                        displayDescription = `- 시작 시간: ${formatTime(schedule.startTime)}
${displayDescription}`;
                                    }
                                } else if (dateStr === formattedEndDate) {
                                    displayTitle += ' 마감일';
                                    if (schedule.endTime) {
                                        displayDescription = `- 종료 시간: ${formatTime(schedule.endTime)}
${displayDescription}`;
                                    }
                                }
                            } else {
                                if (schedule.startTime) {
                                    displayDescription = `- 시작 시간: ${formatTime(schedule.startTime)}
${displayDescription}`;
                                }
                                if (schedule.endTime && schedule.startTime !== schedule.endTime) {
                                    displayDescription = `${displayDescription}
- 종료 시간: ${formatTime(schedule.endTime)}`;
                                } else if (schedule.endTime && !schedule.startTime) {
                                    displayDescription = `- 종료 시간: ${formatTime(schedule.endTime)}
${displayDescription}`;
                                }
                            }


                            return (
                                <div
                                    key={schedule.itemID}
                                    onClick={() => onScheduleClick(schedule)}
                                    className="text-xs px-2 py-1 rounded truncate cursor-pointer hover:opacity-80 flex justify-between items-center group/item"
                                    style={{ backgroundColor: schedule.color || '#E5E7EB', color: '#fff' }}
                                    title={`${displayTitle}\n${displayDescription || ''}`}
                                >
                                    <span className="truncate">{displayTitle}</span>
                                    <button
                                        onClick={(e) => handleDeleteSchedule(schedule.itemID, e)}
                                        className="opacity-0 group-hover/item:opacity-100 ml-1 hover:text-red-200"
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
        }

        return days
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-gray-800">
                        {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                    </h2>
                    <div className="flex gap-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="text-sm text-gray-500 hover:text-askku-primary ml-2">
                            오늘
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm text-gray-700">
                        {['all', 'personal', 'academic', 'course'].map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type === 'course' ? 'course' : (type as any))}
                                className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 font-medium transition-colors ${selectedType === type
                                    ? 'bg-white text-askku-primary shadow'
                                    : 'hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                {type === 'all' ? '전체' : type === 'personal' ? '개인' : type === 'academic' ? '학사' : '과목'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={onAddClick}
                        className="px-4 py-2 bg-askku-primary text-white text-sm font-medium rounded-lg hover:bg-askku-secondary transition-colors flex items-center gap-2"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        <span className="relative -top-[1px]">일정 추가</span>
                    </button>
                </div>
            </div>


            <div className="grid grid-cols-7 border-b border-r border-gray-200 bg-gray-50">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                    <div key={day} className={`py-2 text-center text-sm font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                        {day}
                    </div>
                ))}
            </div>


            <div className="grid grid-cols-7">
                {renderCalendar()}
            </div>
        </div>
    );
}
