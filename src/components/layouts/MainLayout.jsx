import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../services/authApi';
import '../../styles/WorkspacePages.css';
import {
  AppstoreOutlined,
  BarChartOutlined,
  BookOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
  SoundOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const navigation = [
  { key: '/dashboard', icon: <HomeOutlined />, label: 'Tổng quan' },
  { key: '/questions', icon: <QuestionCircleOutlined />, label: 'Ngân hàng câu hỏi & Rubric' },
  { key: '/exam-room', icon: <SoundOutlined />, label: 'Phòng thi mô phỏng' },
  { key: '/grading', icon: <FileSearchOutlined />, label: 'Thẩm định chấm điểm' },
  { key: '/questions/import', icon: <DatabaseOutlined />, label: 'Nhập câu hỏi từ tài liệu' },
  { key: '/users', icon: <TeamOutlined />, label: 'Quản lý người dùng' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Thống kê & Giám sát' },
];

// Lấy chữ cái đầu của 2 từ cuối trong họ tên: "Nguyễn Văn Hùng" -> "VH"
const getInitials = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(-2).map((part) => part[0]).join('').toUpperCase();
};

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = getInitials(user?.fullName);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const goTo = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`main-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div>
          <button className="brand" type="button" onClick={() => goTo('/dashboard')}>
            <span className="brand-mark"><BookOutlined /></span>
            <span className="brand-copy">
              <strong>AI Viva Exam</strong>
              <small>Hệ thống vấn đáp thông minh</small>
            </span>
          </button>

          <div className="exam-status">
            <span><i /> Không gian giảng viên</span>
            <code>AIVES</code>
          </div>

          <nav className="side-nav" aria-label="Điều hướng chính">
            {navigation.map((item) => (
              <button
                type="button"
                key={item.key}
                className={(item.key === '/questions' ? location.pathname === item.key : location.pathname.startsWith(item.key)) ? 'active' : ''}
                onClick={() => goTo(item.key)}
              >
                {item.icon}<span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button type="button" onClick={handleLogout}><LogoutOutlined /><span>Đăng xuất</span></button>
          <div className="lecturer-card">
            <span className="avatar">{initials}</span>
            <span>
              <strong>{user?.fullName}</strong>
              <small>{ROLE_LABELS[user?.role] || user?.role} · {user?.username}</small>
            </span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" type="button" onClick={() => setSidebarOpen((value) => !value)}>
              {sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            </button>
            <div className="product-name"><AppstoreOutlined /> <span>AI Oral Exam System</span></div>
          </div>

          <div className="top-actions">
            <button className="btn btn-primary start-button" type="button" aria-label="Bắt đầu phòng thi" onClick={() => navigate('/exam-room')}>
              <SoundOutlined /><span>Bắt đầu phòng thi</span>
            </button>
            <Dropdown
              menu={{
                items: [
                  { key: 'who', label: `${user?.fullName} · ${ROLE_LABELS[user?.role] || user?.role}`, disabled: true },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: handleLogout },
                ],
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <button className="account-trigger" type="button" aria-label="Mở menu tài khoản">
                <span className="top-avatar">{initials}</span>
                <span className="account-copy"><strong>{user?.fullName || user?.username}</strong><small>{ROLE_LABELS[user?.role] || user?.role} ({user?.role})</small></span>
              </button>
            </Dropdown>
            <button className="btn btn-secondary header-logout" type="button" onClick={handleLogout}><LogoutOutlined /> Đăng xuất</button>
          </div>
        </header>

        <main className="page-canvas"><Outlet /></main>
      </section>
    </div>
  );
}
