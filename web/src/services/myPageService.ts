import api from '../api/axiosInstance';
import { Schedule, Timetable, TimetableItem, Calendar } from '../types';

// ======================================================
// SCHEDULE MANAGEMENT (캘린더 일정)
// ======================================================

/**
 * 사용자 기본 캘린더의 일정 목록 조회
 * - Primary Calendar의 모든 일정 반환
 * - 실패 시 빈 배열 반환
 */
export const getPrimaryCalendarSchedules = async (): Promise<Schedule[]> => {
    try {
        const response = await api.get<{ calendar: Calendar }>('/api/schedule/primary');
        return response.data.calendar.schedules || [];
    } catch (error) {
        console.error('Failed to fetch primary calendar schedules:', error);
        return [];
    }
};

/**
 * Primary Calendar에 새 일정 추가
 * - 제목, 날짜, 시간, 타입, 위치 등 포함
 * - date 필드는 startDate/endDate로 자동 매핑
 */
export const addPrimaryScheduleItem = async (schedule: Omit<Schedule, 'itemID'>): Promise<Schedule> => {
    const payload = {
        title: schedule.title,
        description: schedule.description,
        startDate: schedule.startDate || schedule.date,
        endDate: schedule.endDate || schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        isAllDay: schedule.allDay ?? false,
        type: schedule.type,
        location: schedule.location,
        color: schedule.color,
        courseName: schedule.courseName
    };

    const response = await api.post<Schedule>('/api/schedule/primary/items', payload);
    return response.data;
};

/**
 * 기존 일정 수정
 * - 부분 업데이트 지원 (변경된 필드만 전송)
 * - undefined 값은 자동 제외
 */
export const updateScheduleItem = async (itemId: string, scheduleData: Partial<Omit<Schedule, 'itemID'>>): Promise<Schedule> => {
    const payload: any = {
        title: scheduleData.title,
        description: scheduleData.description,
        startDate: scheduleData.startDate || scheduleData.date,
        endDate: scheduleData.endDate || scheduleData.date,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        isAllDay: scheduleData.allDay,
        type: scheduleData.type,
        location: scheduleData.location,
        color: scheduleData.color,
        courseName: scheduleData.courseName
    };

    // undefined 값 제거
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const response = await api.put<Schedule>(`/api/schedule/items/${itemId}`, payload);
    return response.data;
};

/**
 * 일정 삭제
 * - itemID 기준으로 삭제
 */
export const deleteScheduleItem = async (itemId: string): Promise<void> => {
    await api.delete(`/api/schedule/items/${itemId}`);
};

// ======================================================
// TIMETABLE MANAGEMENT (시간표)
// ======================================================

/**
 * 사용자 시간표 조회
 * - Primary Timetable 정보 반환
 * - 실패 시 빈 시간표 객체 반환 (UI 크래시 방지)
 */
export const getTimetable = async (): Promise<Timetable> => {
    try {
        const response = await api.get<{ timetable: Timetable }>('/api/timetable/primary');
        return response.data.timetable;
    } catch (error) {
        console.error('Failed to fetch timetable:', error);
        // 네트워크 오류 등 실패 시 fallback
        return { timetableID: 0, userID: 0, createdAt: '', items: [] };
    }
};

/**
 * 시간표에 수업(과목) 추가
 * - 과목명, 요일, 시간, 교수명, 강의실 등
 * - itemID와 timetableID는 서버에서 자동 생성
 */
export const addTimetableItem = async (item: Omit<TimetableItem, 'itemID' | 'timetableID'>): Promise<TimetableItem> => {
    const response = await api.post<TimetableItem>('/api/timetable/primary/items', item);
    return response.data;
};

/**
 * 시간표 수업 정보 수정
 * - 부분 업데이트 지원
 */
export const updateTimetableItem = async (itemId: number, item: Partial<Omit<TimetableItem, 'itemID' | 'timetableID'>>): Promise<TimetableItem> => {
    const response = await api.put<TimetableItem>(`/api/timetable/items/${itemId}`, item);
    return response.data;
};

/**
 * 시간표에서 수업 삭제
 */
export const deleteTimetableItem = async (itemId: number): Promise<void> => {
    await api.delete(`/api/timetable/items/${itemId}`);
};

// ======================================================
// USER INFORMATION (추가 정보)
// ======================================================

/**
 * 사용자 추가 정보 저장
 * - 회원가입 후 선택 입력 정보 저장
 * - JWT 토큰 필요
 */
export const saveUserInformation = async (information: string): Promise<boolean> => {
    console.log('Attempting to save user additional information...');
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('saveUserInformation: No authentication token found.');
            return false;
        }
        console.log('saveUserInformation: Token found:', token);

        const payload = { additionalInfo: information };
        console.log('saveUserInformation: Payload:', payload);

        await api.put('/api/users/additional-info',
            payload,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('saveUserInformation: Additional information saved successfully.');
        return true;
    } catch (error: any) {
        console.error('saveUserInformation: Failed to save user additional information:', error);
        if (error.response) {
            console.error('saveUserInformation: Error data:', JSON.stringify(error.response.data));
            console.error('saveUserInformation: Error status:', error.response.status);
            console.error('saveUserInformation: Error headers:', error.response.headers);
        } else if (error.request) {
            console.error('saveUserInformation: No response received:', error.request);
        } else {
            console.error('saveUserInformation: Error message:', error.message);
        }
        return false;
    }
}

/**
 * 사용자 추가 정보 조회
 * - 현재 미구현 (null 반환)
 */
export const getUserInformation = (): string | null => {
    return null;
}