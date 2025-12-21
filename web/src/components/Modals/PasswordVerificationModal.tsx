import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { verifyPassword } from '../../services/authService'

interface PasswordVerificationModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (password: string) => void
}

export default function PasswordVerificationModal({
    isOpen,
    onClose,
    onSuccess,
}: PasswordVerificationModalProps) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!password) {
            setError('비밀번호를 입력해주세요.')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            const response = await verifyPassword(password)

            if (response.success) {
                onSuccess(password)
                setPassword('')
                setError('')
            } else {
                setError(response.message || '비밀번호가 일치하지 않습니다.')
            }
        } catch (err) {
            setError('비밀번호 확인 중 오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setPassword('')
        setError('')
        onClose()
    }

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
                <h2 className="text-xl font-semibold mb-4">비밀번호 확인</h2>
                <p className="text-gray-600 mb-4">개인 정보 수정을 위해 비밀번호를 입력해주세요.</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            비밀번호
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-askku-primary text-white rounded-md hover:bg-askku-dark-primary transition-colors disabled:opacity-50"
                        >
                            {isLoading ? '확인 중...' : '확인'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    )
}
