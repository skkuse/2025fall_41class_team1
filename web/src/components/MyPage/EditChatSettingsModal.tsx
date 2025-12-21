import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { saveUserInformation } from '../../services/myPageService'
import { useUser } from '../../contexts/UserContext'

/**
 * 채팅 설정 편집 모달
 * - AI 대화 시 활용할 사용자 추가 정보 입력
 * - 전공, 관심사, 선호 말투 등 설정
 */

interface EditChatSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
}

export default function EditChatSettingsModal({ isOpen, onClose, onSave }: EditChatSettingsModalProps) {
    const { user, fetchUser } = useUser()
    const [information, setInformation] = useState('')

    useEffect(() => {
        if (isOpen) {
            setInformation(user?.additional_info || '')
            console.log('EditChatSettingsModal: Initial information from user context:', user?.additional_info);
        }
    }, [isOpen, user?.additional_info])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log('EditChatSettingsModal: Submitting information:', information);
        const success = await saveUserInformation(information)
        console.log('EditChatSettingsModal: saveUserInformation success:', success);

        if (success) {
            await fetchUser()
            console.log('EditChatSettingsModal: User data re-fetched.');
            onSave()
            onClose()
        } else {
            console.error('EditChatSettingsModal: Failed to save additional information.');
        }
    }

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">대화 설정 관리</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="information" className="block text-sm font-medium text-gray-700 mb-1">
                            대화 프롬프트
                        </label>
                        <textarea
                            id="information"
                            value={information}
                            onChange={(e) => setInformation(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-askku-primary/50"
                            placeholder="AI가 대화할 때 참고할 내용을 적어주세요.
예: 전공/관심사, 설명 난이도, 말투, 규칙 등
(이 내용은 AI와의 대화에 활용됩니다)"
                        ></textarea>
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
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    )
}
