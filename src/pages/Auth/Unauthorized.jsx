import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { HOME_PATH_BY_ROLE, ROLE_LABELS } from '../../services/authApi';

export default function Unauthorized() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const homePath = HOME_PATH_BY_ROLE[user?.role];

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f6f8fc' }}>
            <Result
                status="403"
                title="Không có quyền truy cập"
                subTitle={
                    user
                        ? `Tài khoản ${user.username} (${ROLE_LABELS[user.role] || user.role}) không được phép vào trang này.`
                        : 'Bạn cần đăng nhập để vào trang này.'
                }
                extra={[
                    homePath && (
                        <Button key="home" type="primary" onClick={() => navigate(homePath, { replace: true })}>
                            Về trang chính
                        </Button>
                    ),
                    <Button key="logout" onClick={handleLogout}>
                        Đăng nhập tài khoản khác
                    </Button>,
                ].filter(Boolean)}
            />
        </div>
    );
}
