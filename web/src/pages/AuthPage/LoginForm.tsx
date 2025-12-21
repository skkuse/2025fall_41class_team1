import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoImage from '../../assets/logo.svg'
import { login } from '../../services/authService'
import { useUser } from '../../contexts/UserContext'

interface LoginFormProps {
    onSwitchToRegister: () => void
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
    const navigate = useNavigate()
    const { fetchUser } = useUser()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await login(email, password)

            if (response.success) {
                await fetchUser()
                navigate('/home')
            } else {
                setError(response.message || '로그인에 실패했습니다')
            }
        } catch (err) {
            setError('로그인 중 오류가 발생했습니다')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* Logo and Title */}
            <div className="flex flex-col items-center mb-8">
                <img
                    src={logoImage}
                    alt="ASKku Logo"
                    className="w-16 h-16 object-contain mb-4"
                />
                <h2 className="text-2xl font-bold text-gray-800 mb-1">로그인</h2>
                <p className="text-gray-500 text-sm">SKKu AI 플랫폼 로그인페이지</p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* 이메일 */}
                <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                        이메일
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@skku.edu"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent text-sm"
                            required
                        />
                    </div>
                </div>

                {/* 비밀번호 */}
                <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">비밀번호</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <rect
                                    x="3"
                                    y="11"
                                    width="18"
                                    height="11"
                                    rx="2"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />
                                <path
                                    d="M7 11V7a5 5 0 0 1 10 0v4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호를 입력하세요"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent text-sm"
                            required
                        />
                    </div>
                </div>

                {/* 로그인 버튼 */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-askku-primary text-white py-2.5 rounded-md font-medium hover:bg-askku-secondary transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? '로그인 중...' : '로그인'}
                </button>

                {/* 구분선 */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-white text-gray-500">또는</span>
                    </div>
                </div>

                {/* 회원가입 링크 */}
                <div className="text-center text-sm">
                    <span className="text-gray-600">계정이 없으신가요? </span>
                    <button
                        type="button"
                        onClick={onSwitchToRegister}
                        className="text-askku-primary font-semibold hover:underline"
                    >
                        회원가입
                    </button>
                </div>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500">© 2025 성균관대학교. 모든 권한 보유.</p>
                <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
                    <a href="#" className="hover:text-askku-primary">개인정보</a>
                    <span>·</span>
                    <a href="#" className="hover:text-askku-primary">책임면책사항</a>
                    <span>·</span>
                    <a href="#" className="hover:text-askku-primary">도움말</a>
                </div>
            </div>
        </div>
    )
}

