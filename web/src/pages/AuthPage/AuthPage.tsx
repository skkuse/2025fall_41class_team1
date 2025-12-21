import { useState } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import AuthHeader from '../../components/Layout/AuthHeader'
import Footer from '../../components/Layout/Footer'

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <AuthHeader />

            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-md">
                    <div
                        className={`transition-all duration-500 ease-in-out ${isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full absolute'
                            }`}
                    >
                        {isLogin && <LoginForm onSwitchToRegister={() => setIsLogin(false)} />}
                    </div>

                    <div
                        className={`transition-all duration-500 ease-in-out ${!isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute'
                            }`}
                    >
                        {!isLogin && <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
