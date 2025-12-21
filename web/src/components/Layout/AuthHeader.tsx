import logoImage from '../../assets/logo.svg'

/**
 * 인증 페이지 헤더 컴포넌트
 * - 로그인/회원가입 페이지 상단에 표시
 * - ASKku 로고 및 플랫폼 설명
 */

export default function AuthHeader() {
    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center h-16">
                    <div className="flex items-center">
                        <img src={logoImage} alt="ASKku" className="w-10 h-10 object-contain" />
                        <span className="ml-3 text-xl font-bold text-askku-primary">ASKku</span>
                        <span className="ml-2 text-sm text-gray-600">성균관대학교 질문답변 플랫폼</span>
                    </div>
                </div>
            </div>
        </header>
    )
}
