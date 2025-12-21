import { useEffect, useState } from 'react'
import { ExtractedSchedule } from '../../types'

/**
 * 일정 선택 모달 컴포넌트
 * - AI가 추출한 일정 목록 표시
 * - 사용자가 저장할 일정 선택
 * - 로딩 상태 표시
 */

interface ScheduleSelectionModalProps {
    isOpen: boolean
    isLoading: boolean
    schedules: ExtractedSchedule[]
    onClose: () => void
    onConfirm: (selected: ExtractedSchedule[]) => void
}

export default function ScheduleSelectionModal({ isOpen, isLoading, schedules, onClose, onConfirm }: ScheduleSelectionModalProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    useEffect(() => {
        if (isOpen) {
            setSelectedIds([])
        }
    }, [isOpen])

    if (!isOpen) return null

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
    }

    const handleConfirm = () => {
        const selected = schedules.filter(s => selectedIds.includes(s.id))
        onConfirm(selected)
    }

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const renderPeriod = (schedule: ExtractedSchedule) => {
        const startDate = formatDate(schedule.startDate)
        const endDate = formatDate(schedule.endDate)
        const sameDay = startDate === endDate

        if (sameDay) {
            return startDate
        }

        return `${startDate} ~ ${endDate}`
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
                <div className="bg-askku-primary px-6 py-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" fill="currentColor" />
                        </svg>
                        일정 추가
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                            <div className="flex gap-2">
                                <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <p className="text-sm font-medium">일정을 분석하고 있습니다...</p>
                        </div>
                    ) : schedules.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-sm">추출된 일정이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-4">추출된 일정 중 캘린더에 추가할 항목을 선택하세요:</p>
                            {schedules.map((schedule) => (
                                <div
                                    key={schedule.id}
                                    onClick={() => toggleSelect(schedule.id)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedIds.includes(schedule.id)
                                            ? 'border-askku-primary bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedIds.includes(schedule.id)
                                                    ? 'bg-askku-primary border-askku-primary'
                                                    : 'border-gray-300'
                                                }`}>
                                                {selectedIds.includes(schedule.id) && (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-800 mb-1">{schedule.title}</h3>
                                            <p className="text-sm text-gray-600 mb-2">{renderPeriod(schedule)}</p>
                                            {schedule.description && (
                                                <p className="text-xs text-gray-500">{schedule.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedIds.length === 0 || isLoading}
                        className="px-5 py-2 bg-askku-primary text-white rounded-lg hover:bg-askku-secondary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {selectedIds.length > 0 ? `${selectedIds.length}개 추가` : '선택 안함'}
                    </button>
                </div>
            </div>
        </div>
    )
}
