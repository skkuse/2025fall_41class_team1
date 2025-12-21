import api from '../api/axiosInstance';
import { Notice } from '../types';

/**
 * 최신 공지사항 목록 조회
 * - 서버에서 최신 공지 데이터 요청
 * - API 응답 구조가 배열 / 객체({ notices }) 모두 가능하다고 가정
 * - 프론트에서 사용하는 Notice 타입으로 정규화하여 반환
 */
export const getLatestNotices = async (): Promise<Notice[]> => {
    try {
        const res = await api.get('/api/notices/latest');

        const rawNotices = Array.isArray(res.data) ? res.data : res.data.notices || [];

        if (!Array.isArray(rawNotices)) {
            console.error('Fetched data is not an array:', rawNotices);
            return [];
        }

        return rawNotices.map((notice: any) => ({
            id: notice.post_num || Date.now() + Math.random(),
            source: notice.board_name,
            title: notice.title,
            date: notice.date,
            url: notice.link,
            content: notice.content || '',
            views: notice.views || 0,
        }));
    } catch (error) {
        console.error('Error fetching latest notices:', error);
        return [];
    }
};
