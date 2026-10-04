import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import QuestionList from './pages/QuestionBank/QuestionList';
import ImportQuestion from './pages/QuestionBank/ImportQuestion';
import ExamRoom from './pages/Interview/ExamRoom';
import GradingDashboard from './pages/Grading/GradingDashboard';
import ReviewTranscript from './pages/Grading/ReviewTranscript';
import Dashboard from './pages/Dashboard/Dashboard';
import MainLayout from './components/layouts/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Unauthorized from './pages/Auth/Unauthorized';
import HomeRedirect from './components/common/HomeRedirect';
import { ROLES } from './services/authApi';

export default function AppRoutes() {
    return (
        <Router>
            <Routes>
                {/* Public Routes (Không có Layout / Layout rỗng) */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Protected Routes dành cho Giảng viên (Có MainLayout) */}
                <Route element={<ProtectedRoute requiredRole={ROLES.LECTURER} />}>
                    <Route element={<MainLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/questions" element={<QuestionList />} />
                        <Route path="/questions/import" element={<ImportQuestion />} />
                        <Route path="/grading" element={<GradingDashboard />} />
                        <Route path="/grading/review" element={<ReviewTranscript />} />
                    </Route>
                </Route>

                {/* Phòng thi: Sinh viên vào thi, Giảng viên mở để chạy thử (Test Run) -> chỉ cần đăng nhập */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/exam-room" element={<ExamRoom />} />
                    {/* Vào "/" thì điều hướng về trang chính theo vai trò */}
                    <Route path="/" element={<HomeRedirect />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}
