import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ requiredRole }) => {
    // Để demo, chúng ta tạm giả định user có role 'teacher'. 
    // Khi ráp API thật, bạn sẽ lấy từ AuthContext
    const { user } = useContext(AuthContext); 
    
    // Tạm thời fake auth để test giao diện
    const isAuthenticated = true; // Sẽ thay bằng: !!user
    const userRole = 'teacher'; // Sẽ thay bằng: user?.role
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Tạm thời comment đoạn check Role lại để dễ dàng test UI cho cả màn hình Student và Teacher
    // if (requiredRole && userRole !== requiredRole) {
    //     return <Navigate to="/unauthorized" replace />;
    // }

    // Render các route con (Outlet)
    return <Outlet />;
};

export default ProtectedRoute;
