/**
 * 페이지네이션 컴포넌트
 * - 현재 페이지와 전체 페이지 수 기반으로 표시
 * - 이전/다음 버튼 및 페이지 번호 버튼 제공
 * - 최대 5개의 페이지 번호 표시
 */

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    // 최대 5개의 페이지 번호만 표시
    const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1)

    return (
        <div className="flex items-center justify-center gap-2 py-8">
            {/* 이전 버튼 */}
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* 페이지 번호 */}
            {pages.map((page) => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${currentPage === page
                        ? 'bg-askku-primary text-white'
                        : 'border border-gray-300 hover:bg-gray-100'
                        }`}
                >
                    {page}
                </button>
            ))}

            {/* 다음 버튼 */}
            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        </div>
    )
}
