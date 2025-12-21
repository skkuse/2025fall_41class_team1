import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage/AuthPage'
import HomePage from './pages/HomePage/HomePage'
import ChatPage from './pages/ChatPage/ChatPage'
import MyPage from './pages/MyPage/MyPage'
import MainLayout from './components/Layout/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { UserProvider } from './contexts/UserContext'

function App() {
    return (
        <UserProvider>
            <BrowserRouter>
                <Routes>
                    {/* Auth Route */}
                    <Route path="/" element={<AuthPage />} />

                    {/* Protected Main App Routes with Layout */}
                    <Route
                        path="/home"
                        element={
                            <ProtectedRoute>
                                <MainLayout>
                                    <HomePage />
                                </MainLayout>
                            </ProtectedRoute>
                        }
                    />
                    
                    <Route
                        path="/chat"
                        element={
                            <ProtectedRoute>
                                <MainLayout>
                                    <ChatPage />
                                </MainLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/mypage"
                        element={
                            <ProtectedRoute>
                                <MainLayout>
                                    <MyPage />
                                </MainLayout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Redirect unknown routes to home */}
                    <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
            </BrowserRouter>
        </UserProvider>
    )
}

export default App
