export interface Notice {
    id: number
    source: string
    title: string
    content: string
    date: string
    views: number
    url?: string
}

export interface User {
    userID: string
    email: string
    name: string
    password_hash: string
    campus: string
    admissionYear: number
    semester: number
    grade: number
    department: string
    createdAt: string
    introduction?: string
    additional_info?: string
}

export interface RegisterData {
    lastName: string
    firstName: string
    email: string
    admissionYear: number
    grade: number
    semester: number
    department: string
    campus: string
    password: string
}

export interface AuthResponse {
    success: boolean
    token?: string
    user?: User
    message?: string
}

export type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    isBookmarked: boolean;
    bookmarkID?: number;
    format: 'text' | 'markdown' | 'sources';
    isLoading?: boolean;
    sources?: any[];
};

export interface Bookmark {
    id: string
    bookmarkID?: number
    title: string
    question: string
    answer: string
    sources?: any[]
    timestamp: string
}


export type ChatSession = {
    id: string;
    messages: ChatMessage[];
    createdAt: string;
};

export interface Schedule {
    itemID: string
    title: string
    date: string
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
    allDay?: boolean
    location?: string
    sourceId?: string
    type: 'personal' | 'academic' | 'subject' | 'event' | 'other'
    description?: string
    color?: string
    subject?: string
    courseName?: string;
}

export type ExtractedSchedule = {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    allDay?: boolean;
    description?: string;
    type?: string;
    location?: string;
    color?: string;
};

export interface Timetable {
    timetableID: number;
    userID: number;
    createdAt: string;
    items: TimetableItem[];
}

export interface TimetableItem {
    itemID: number;
    timetableID: number;
    courseName: string;
    dayOfWeek: '월' | '화' | '수' | '목' | '금';
    startTime: string;
    endTime: string;
    location: string;
    alias?: string;
    color?: string;
}

export interface Calendar {
    calendarID: number;
    userID: number;
    title: string;
    schedules: Schedule[];
    createdAt: string;
    updatedAt: string;
}
