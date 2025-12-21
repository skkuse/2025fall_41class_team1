import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useUser } from '../../contexts/UserContext'
import { getUserInfo } from '../../services/authService'

/**
 * 개인 정보 수정 모달 (EditPersonalInfoModal)
 * - 사용자 기본 정보 편집
 * - 비밀번호 변경 기능 포함
 * - 프로필 업데이트 API 호출
 */

interface EditPersonalInfoModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function EditPersonalInfoModal({ isOpen, onClose }: EditPersonalInfoModalProps) {
    const { user, fetchUser } = useUser()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        admissionYear: '',
        currentGrade: 1,
        currentSemester: 1,
        department: '',
        campus: '',
        password: '',
        confirmPassword: '',
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const departments = [
        '소프트웨어학과',
        '컴퓨터공학과',
        '전자전기공학부',
        '글로벌경제학과',
        '글로벌경영학과',
        '기타',
    ]

    const campuses = [
        '인문사회캠퍼스',
        '자연과학캠퍼스',
    ]

    const currentYear = new Date().getFullYear()
    const admissionYears = Array.from({ length: 11 }, (_, i) => currentYear - i)

    useEffect(() => {
        const fetchUserData = async () => {
            if (isOpen) {
                setLoading(true)
                try {
                    const userInfo = await getUserInfo();
                    if (userInfo) {
                        setFormData({
                            name: userInfo.name || '',
                            email: userInfo.email || '',
                            admissionYear: userInfo.admissionYear?.toString() || '',
                            currentGrade: userInfo.grade || 1,
                            currentSemester: userInfo.semester || 1,
                            department: userInfo.department || '',
                            campus: userInfo.campus || '',
                            password: '',
                            confirmPassword: '',
                        })
                    } else if (user) {
                        setFormData({
                            name: user.name || '',
                            email: user.email || '',
                            admissionYear: '',
                            currentGrade: user.grade || 1,
                            currentSemester: 1,
                            department: user.department || '',
                            campus: '',
                            password: '',
                            confirmPassword: '',
                        })
                    }
                } catch (error) {
                    if (user) {
                        setFormData({
                            name: user.name || '',
                            email: user.email || '',
                            admissionYear: '',
                            currentGrade: user.grade || 1,
                            currentSemester: 1,
                            department: user.department || '',
                            campus: '',
                            password: '',
                            confirmPassword: '',
                        })
                    }
                } finally {
                    setLoading(false)
                }
            }
        }
        fetchUserData()
    }, [isOpen, user, fetchUser])

    if (!isOpen) return null

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value,
        }))

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // 비밀번호 검증 (입력된 경우만)
        if (formData.password || formData.confirmPassword) {
            const newErrors: Record<string, string> = {}
            if (formData.password.length > 0 && formData.password.length < 8) {
                newErrors.password = '비밀번호는 8자 이상이어야 합니다'
            } else if (formData.password.length > 0 && !/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
                newErrors.password = '비밀번호는 특수문자를 포함해야 합니다'
            }
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = '새 비밀번호가 일치하지 않습니다'
            }
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors)
                return
            }
        }

        setLoading(true)
        setErrors({})

        try {
            // API 호출 데이터 준비
            const updateData: any = {
                name: formData.name,
                department: formData.department,
                campus: formData.campus,
                admissionYear: formData.admissionYear ? parseInt(formData.admissionYear) : undefined,
                grade: formData.currentGrade,
                semester: formData.currentSemester,
            }

            // 비밀번호가 입력된 경우만 포함
            if (formData.password && formData.password.length > 0) {
                updateData.password = formData.password
            }


            const { updateProfile } = await import('../../services/authService')
            const response = await updateProfile(updateData)

            if (response.success) {
                alert(response.message || '개인정보가 성공적으로 수정되었습니다.')
                // 사용자 컨텍스트 새로고침
                await fetchUser()
                onClose()
            } else {
                setErrors({ submit: response.message || '개인정보 수정에 실패했습니다.' })
            }
        } catch (error) {
            console.error('Profile update error:', error)
            setErrors({ submit: '개인정보 수정 중 오류가 발생했습니다.' })
        } finally {
            setLoading(false)
        }
    }

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-auto overflow-y-auto max-h-[90vh]">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">개인 정보 수정</h2>

                {loading ? (
                    <div className="text-center py-8">로딩 중...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {errors.submit && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">{errors.submit}</p>
                            </div>
                        )}


                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1.5">이름</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="이름"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent text-sm"
                            />
                        </div>


                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1.5">
                                이메일 주소
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
                            />
                        </div>


                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-1.5">입학년도</label>
                                <select
                                    name="admissionYear"
                                    value={formData.admissionYear}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent bg-white text-sm ${errors.admissionYear ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                >
                                    <option value="">선택</option>
                                    {admissionYears.map((year) => (
                                        <option key={year} value={year.toString()}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                                {errors.admissionYear && (
                                    <p className="text-red-500 text-xs mt-1">{errors.admissionYear}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-1.5">현재 학년</label>
                                <select
                                    name="currentGrade"
                                    value={formData.currentGrade}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent bg-white text-sm"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7].map((grade) => (
                                        <option key={grade} value={grade}>
                                            {grade}학년
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-1.5">학기</label>
                                <select
                                    name="currentSemester"
                                    value={formData.currentSemester}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent bg-white text-sm"
                                >
                                    <option value={1}>1학기</option>
                                    <option value={2}>2학기</option>
                                </select>
                            </div>
                        </div>


                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-1.5">캠퍼스</label>
                                <select
                                    name="campus"
                                    value={formData.campus}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent bg-white text-sm"
                                >
                                    <option value="">선택</option>
                                    {campuses.map((campus) => (
                                        <option key={campus} value={campus}>
                                            {campus}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-800 mb-1.5">학과</label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent bg-white text-sm"
                                >
                                    <option value="">선택</option>
                                    {departments.map((dept) => (
                                        <option key={dept} value={dept}>
                                            {dept}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>


                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1.5">
                                새 비밀번호 (선택 사항)
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent text-sm ${errors.password ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        />
                                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                            )}
                            <p className="text-gray-500 text-xs mt-1">8자 이상, 특수문자 포함</p>
                        </div>


                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1.5">
                                새 비밀번호 확인
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-askku-primary focus:border-transparent text-sm ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        />
                                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-askku-primary text-white rounded-lg hover:bg-askku-secondary transition-colors"
                            >
                                저장
                            </button>                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body,
    )
}