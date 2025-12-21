/**
 * 푸터 컴포넌트
 * - 저작권 정보 표시
 * - 이용약관, 개인정보처리방침 등 링크
 */

export default function Footer() {
    return (
        <footer className="bg-white border-t mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex justify-between items-center text-sm text-gray-600">
                    <div>© 2025 성균관대학교. 모든 권리 보유.</div>
                    <div className="flex space-x-6">
                        <a href="#" className="hover:text-askku-primary transition-colors">
                            이용약관
                        </a>
                        <a href="#" className="hover:text-askku-primary transition-colors">
                            개인정보처리방침
                        </a>
                        <a href="#" className="hover:text-askku-primary transition-colors">
                            문의
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
