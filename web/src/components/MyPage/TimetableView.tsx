import { TimetableItem } from '../../types'

/**
 * 시간표 뷰 컴포넌트
 * - 주간 시간표 형식 (월~금, 09:00~18:00)
 * - 과목 블록 시각화 및 삭제 기능
 */

interface TimetableViewProps {
    onAddClick: () => void;
    items: TimetableItem[];
    onDeleteItem: (id: number) => void;
}

const HOUR_HEIGHT = 64;
const START_HOUR = 9;
const END_HOUR = 22;
const DAY_HEADERS = ['월', '화', '수', '목', '금'];

export default function TimetableView({ onAddClick, items, onDeleteItem }: TimetableViewProps) {
    const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const getTopPosition = (startTime: string): number => {
        const startMinutes = timeToMinutes(startTime);
        const baseMinutes = START_HOUR * 60;
        const offsetMinutes = startMinutes - baseMinutes;
        return (offsetMinutes / 60) * HOUR_HEIGHT;
    };

    const getHeight = (startTime: string, endTime: string): number => {
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        const durationMinutes = endMinutes - startMinutes;
        return (durationMinutes / 60) * HOUR_HEIGHT;
    };

    const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">시간표</h2>
                <button
                    onClick={onAddClick}
                    className="px-4 py-2 bg-askku-primary text-white rounded-lg hover:bg-askku-secondary transition-colors"
                >
                    + 수업 추가
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="flex gap-2">
                    <div className="w-16 flex-shrink-0">
                        <div className="h-12"></div>
                        {hours.map((hour) => (
                            <div
                                key={hour}
                                className="text-sm text-gray-600 text-right pr-2"
                                style={{ height: `${HOUR_HEIGHT}px`, lineHeight: `${HOUR_HEIGHT}px` }}
                            >
                                {hour.toString().padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>

                    {DAY_HEADERS.map((day) => {
                        const dayItems = items.filter((item) => item.dayOfWeek === day);
                        return (
                            <div key={day} className="flex-1 relative border-l border-gray-200">
                                <div className="h-12 flex items-center justify-center font-bold text-gray-700 border-b border-gray-200">
                                    {day}
                                </div>

                                <div className="relative" style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
                                    {hours.map((hour) => (
                                        <div
                                            key={hour}
                                            className="border-b border-gray-100"
                                            style={{ height: `${HOUR_HEIGHT}px` }}
                                        ></div>
                                    ))}

                                    {dayItems.map((item) => (
                                        <div
                                            key={item.itemID}
                                            className="absolute left-0 right-0 mx-1 rounded-lg shadow-md overflow-hidden group cursor-pointer"
                                            style={{
                                                top: `${getTopPosition(item.startTime)}px`,
                                                height: `${getHeight(item.startTime, item.endTime)}px`,
                                                backgroundColor: item.color || '#DBEAFE'
                                            }}
                                        >
                                            <div className="p-2 h-full flex flex-col justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">
                                                        {item.alias || item.courseName}
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {item.startTime.substring(0, 5)} - {item.endTime.substring(0, 5)}
                                                    </p>
                                                    <p className="text-xs text-gray-600">{item.location}</p>
                                                </div>
                                                <button
                                                    onClick={() => onDeleteItem(item.itemID)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 text-xs font-medium"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}