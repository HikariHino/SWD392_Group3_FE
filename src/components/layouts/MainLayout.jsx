import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  DatabaseOutlined,
  FileSearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  NotificationOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SoundOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons';

const navigation = [
  { key: '/questions', icon: <QuestionCircleOutlined />, label: 'Ngân hàng câu hỏi & Rubric' },
  { key: '/exam-room', icon: <SoundOutlined />, label: 'Phòng thi mô phỏng' },
  { key: '/grading', icon: <FileSearchOutlined />, label: 'Thẩm định chấm điểm' },
  { key: '/questions/import', icon: <DatabaseOutlined />, label: 'Kho tài liệu & RAG' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Thống kê & Giám sát' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [synced, setSynced] = useState(false);

  const goTo = (path) => {
    if (path === '/reports') return;
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`main-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div>
          <button className="brand" type="button" onClick={() => goTo('/questions')}>
            <span className="brand-mark"><BookOutlined /></span>
            <span className="brand-copy">
              <strong>AI Viva Exam</strong>
              <small>Hệ thống vấn đáp thông minh</small>
            </span>
          </button>

          <div className="exam-status">
            <span><i /> Kỳ thi đang diễn ra</span>
            <code>HĐH-2025</code>
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
          <button type="button"><SettingOutlined /><span>Cài đặt hệ thống</span></button>
          <button type="button"><MessageOutlined /><span>Trợ giúp & Hướng dẫn</span></button>
          <div className="lecturer-card">
            <span className="avatar">NH</span>
            <span>
              <strong>TS. Nguyễn Văn Hùng</strong>
              <small>Chủ nhiệm Bộ môn HTTT</small>
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

          <nav className="top-links">
            <button className="selected" type="button"><CalendarOutlined /> Kỳ thi 2025</button>
            <button type="button"><UserOutlined /> Lớp môn học</button>
            <button type="button"><NotificationOutlined /> Báo cáo gian lận</button>
          </nav>

          <div className="top-actions">
            <button
              className="btn btn-soft sync-button"
              type="button"
              onClick={() => { setSynced(true); window.setTimeout(() => setSynced(false), 1800); }}
            >
              {synced ? <CheckCircleFilled /> : <SyncOutlined spin={synced} />}
              <span>{synced ? 'Đã đồng bộ' : 'Đồng bộ RAG'}</span>
            </button>
            <button className="btn btn-primary start-button" type="button" onClick={() => navigate('/exam-room')}>
              <SoundOutlined /><span>Bắt đầu phòng thi</span>
            </button>
            <button className="icon-button notification-button" type="button" aria-label="Thông báo"><BellOutlined /><i /></button>
            <span className="top-avatar">NH</span>
          </div>
        </header>

        <main className="page-canvas"><Outlet /></main>
      </section>
    </div>
  );
}
