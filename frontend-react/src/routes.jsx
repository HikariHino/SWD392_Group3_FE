import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import QuestionList from './pages/QuestionBank/QuestionList';
import ImportQuestion from './pages/QuestionBank/ImportQuestion';
import ExamRoom from './pages/Interview/ExamRoom';
import GradingDashboard from './pages/Grading/GradingDashboard';
import ReviewTranscript from './pages/Grading/ReviewTranscript';
import MainLayout from './components/layouts/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

export default function AppRoutes() {
    return (
        <Router>
            <Routes>
                {/* Public Routes (Không có Layout / Layout rỗng) */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/unauthorized" element={<div style={{padding: 20}}>403 - Bạn không có quyền truy cập trang này.</div>} />

                {/* Protected Routes dành cho Teacher (Có MainLayout) */}
                <Route element={<ProtectedRoute requiredRole="teacher" />}>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<Navigate to="/grading" replace />} />
                        <Route path="/questions" element={<QuestionList />} />
                        <Route path="/questions/import" element={<ImportQuestion />} />
                        <Route path="/grading" element={<GradingDashboard />} />
                        <Route path="/grading/review" element={<ReviewTranscript />} />
                    </Route>
                </Route>

                {/* Route dành riêng cho Student (Phòng thi - Có thể không dùng MainLayout) */}
                <Route element={<ProtectedRoute requiredRole="student" />}>
                    <Route path="/exam-room" element={<ExamRoom />} />
                </Route>
            </Routes>
        </Router>
    );
}
