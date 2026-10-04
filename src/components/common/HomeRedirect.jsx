import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HOME_PATH_BY_ROLE } from '../../services/authApi';

/** Điều hướng "/" về trang chính tương ứng với vai trò đang đăng nhập. */
export default function HomeRedirect() {
    const { user } = useAuth();
    return <Navigate to={HOME_PATH_BY_ROLE[user?.role] || '/unauthorized'} replace />;
}
