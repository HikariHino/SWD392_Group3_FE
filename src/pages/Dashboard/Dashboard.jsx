import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightOutlined,
  BarChartOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  FileSearchOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
  SoundOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import './Dashboard.css';

const destinations = [
  {
    path: '/questions',
    tone: 'blue',
    icon: <QuestionCircleOutlined />,
    eyebrow: 'Học liệu & Rubric',
    title: 'Ngân hàng câu hỏi',
    description: 'Quản lý câu hỏi vấn đáp, kiểm tra nguồn RAG và chuẩn hóa ma trận Rubric trước kỳ thi.',
    action: 'Mở ngân hàng câu hỏi',
    metrics: [
      { value: '248', label: 'Câu hỏi' },
      { value: '224', label: 'Rubric chuẩn' },
      { value: '18', label: 'Chờ duyệt' },
    ],
  },
  {
    path: '/exam-room',
    tone: 'teal',
    icon: <SoundOutlined />,
    eyebrow: 'Vấn đáp trực tiếp',
    title: 'Phòng thi AI',
    description: 'Trải nghiệm phiên vấn đáp với câu hỏi xoáy thích ứng, ghi âm và Speech-to-Text thời gian thực.',
    action: 'Vào phòng thi',
    metrics: [
      { value: '04', label: 'Phòng đang mở' },
      { value: '32', label: 'Thí sinh' },
      { value: '99.4%', label: 'Hệ thống ổn định' },
    ],
  },
  {
    path: '/grading',
    tone: 'violet',
    icon: <FileSearchOutlined />,
    eyebrow: 'Human-in-the-loop',
    title: 'Thẩm định chấm điểm',
    description: 'Đối chiếu transcript và Rubric AI, điều chỉnh điểm và xác nhận kết quả chính thức.',
    action: 'Mở trung tâm thẩm định',
    metrics: [
      { value: '46', label: 'Bài đã chấm' },
      { value: '12', label: 'Chờ duyệt' },
      { value: '94%', label: 'Tin cậy AI' },
    ],
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="overview-dashboard">
      <section className="dashboard-hero">
        <div>
          <span className="dashboard-kicker"><ThunderboltOutlined /> Trung tâm điều hành kỳ thi HĐH-2025</span>
          <h1>Xin chào, TS. Nguyễn Văn Hùng</h1>
          <p>Theo dõi và truy cập nhanh toàn bộ quy trình vấn đáp AI từ một nơi.</p>
        </div>
        <div className="system-health">
          <span className="health-icon"><SafetyCertificateOutlined /></span>
          <div><small>Trạng thái hệ thống</small><strong><i /> Tất cả dịch vụ hoạt động tốt</strong><span>Cập nhật vài giây trước</span></div>
        </div>
      </section>

      <section className="dashboard-summary" aria-label="Thống kê tổng quan">
        <article><span className="summary-icon blue"><QuestionCircleOutlined /></span><div><small>Tổng câu hỏi</small><strong>248</strong><em>+12 trong tháng</em></div></article>
        <article><span className="summary-icon teal"><SoundOutlined /></span><div><small>Phiên thi hôm nay</small><strong>18</strong><em>4 phòng đang diễn ra</em></div></article>
        <article><span className="summary-icon violet"><CheckCircleFilled /></span><div><small>Bài đã thẩm định</small><strong>46</strong><em>12 bài đang chờ</em></div></article>
        <article><span className="summary-icon amber"><BarChartOutlined /></span><div><small>Điểm trung bình</small><strong>8.1</strong><em>Tăng 0.4 điểm</em></div></article>
      </section>

      <section className="destination-section">
        <div className="dashboard-section-heading">
          <div><h2>Không gian làm việc</h2><p>Chọn một chức năng để bắt đầu.</p></div>
          <span>3 phân hệ chính</span>
        </div>

        <div className="destination-grid">
          {destinations.map((item) => (
            <article
              className={`destination-card ${item.tone}`}
              key={item.path}
              role="link"
              tabIndex="0"
              onClick={() => navigate(item.path)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(item.path); }}
            >
              <div className="destination-top">
                <span className="destination-icon">{item.icon}</span>
                <span className="destination-eyebrow">{item.eyebrow}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <div className="destination-metrics">
                {item.metrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><small>{metric.label}</small></div>)}
              </div>
              <button type="button" onClick={(event) => { event.stopPropagation(); navigate(item.path); }}>{item.action}<ArrowRightOutlined /></button>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="activity-card">
          <div className="dashboard-section-heading"><div><h2>Hoạt động gần đây</h2><p>Cập nhật mới nhất trong kỳ thi.</p></div></div>
          <div className="activity-list">
            <div><span className="activity-avatar blue">AI</span><p><strong>18 câu hỏi RAG mới đã được đề xuất</strong><small>Ngân hàng câu hỏi · 12 phút trước</small></p><button type="button" onClick={() => navigate('/questions')}>Xem</button></div>
            <div><span className="activity-avatar teal"><SoundOutlined /></span><p><strong>Phòng thi 04 vừa hoàn thành 8 lượt vấn đáp</strong><small>Phòng thi AI · 28 phút trước</small></p><button type="button" onClick={() => navigate('/exam-room')}>Mở</button></div>
            <div><span className="activity-avatar violet"><FileSearchOutlined /></span><p><strong>12 bài thi đang chờ giảng viên thẩm định</strong><small>Chấm điểm · 45 phút trước</small></p><button type="button" onClick={() => navigate('/grading')}>Duyệt</button></div>
          </div>
        </article>

        <article className="schedule-card">
          <div className="dashboard-section-heading"><div><h2>Lịch hôm nay</h2><p>Thứ Năm, 01/10/2026</p></div><ClockCircleOutlined /></div>
          <div className="schedule-item active"><time>09:00</time><div><strong>Hệ điều hành · Phòng 04</strong><small>32 thí sinh · Đang diễn ra</small></div><i /></div>
          <div className="schedule-item"><time>13:30</time><div><strong>Cơ sở dữ liệu · Phòng 02</strong><small>28 thí sinh · Sắp diễn ra</small></div></div>
          <div className="schedule-item"><time>15:45</time><div><strong>Kiến trúc máy tính · Phòng 01</strong><small>24 thí sinh · Đã lên lịch</small></div></div>
        </article>
      </section>
    </div>
  );
}
