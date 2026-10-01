import React, { useMemo, useState } from 'react';
import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CloudDownloadOutlined,
  DownOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FilterOutlined,
  LinkOutlined,
  LockOutlined,
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  SoundOutlined,
  TableOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import './QuestionList.css';

const initialQuestions = [
  {
    id: 'Q-RAG-2041',
    bloom: 'Phân tích',
    bloomEn: 'Analyze',
    type: 'ai',
    title: 'Phân mảnh ngoài (External Fragmentation) là gì? Hãy giải thích nguyên nhân xảy ra trong cấp phát bộ nhớ phân đoạn và so sánh với phân trang?',
    source: 'Trang 142 Giáo trình Hệ điều hành v2 (Mục 4.3.2 Kỹ thuật cấp phát biến đổi)',
    duration: '3 – 4 phút',
  },
  {
    id: 'Q-OFF-1092',
    bloom: 'Vận dụng',
    bloomEn: 'Apply',
    type: 'official',
    title: 'Tính tỷ lệ trúng trang (Hit ratio) và độ trễ hiệu dụng của bộ nhớ khi dùng TLB với thông số cho trước?',
    source: 'Slide Chương 4, trang 28–31',
    used: 142,
    updated: '12/02/2025 bởi GV. Lê Quang',
  },
  {
    id: 'Q-OFF-0871',
    bloom: 'Hiểu',
    bloomEn: 'Understand',
    type: 'official',
    title: 'Giải thích nguyên lý hoạt động của bảng phân trang (Page Table) và mục đích của bit Valid/Invalid trong từng mục phân trang?',
    source: 'Giáo trình HĐH v2 (Mục 4.2)',
    used: 89,
    updated: '08/01/2025 bởi GV. Nguyễn Văn Hùng',
  },
];

const rubricLevels = [
  { label: 'Giỏi (2.5 – 3.0đ)', tone: 'excellent', text: 'Nêu chính xác định nghĩa phân mảnh ngoài. Giải thích rõ nguyên nhân do các khối nhớ tự do bị chia nhỏ rải rác, không liên tục khiến yêu cầu cấp phát không đáp ứng được dù tổng dung lượng còn thừa.' },
  { label: 'Khá (1.8 – 2.4đ)', tone: 'good', text: 'Hiểu bản chất phân mảnh ngoài nhưng trình bày nguyên nhân chưa thật sự liền mạch hoặc thiếu khía cạnh “tổng dung lượng đủ nhưng không liên tục”.' },
  { label: 'Trung bình / Yếu (< 1.8đ)', tone: 'average', text: 'Nhầm lẫn sang phân mảnh nội (Internal fragmentation) hoặc không nêu được cơ chế cấp phát động.' },
];

function BloomBadge({ question }) {
  const icon = question.bloom === 'Phân tích' ? <ApartmentOutlined /> : question.bloom === 'Vận dụng' ? <ExperimentOutlined /> : <BookOutlined />;
  return <span className={`bloom-badge bloom-${question.bloomEn.toLowerCase()}`}>{icon} Bloom: {question.bloom} ({question.bloomEn})</span>;
}

export default function QuestionList() {
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedId, setSelectedId] = useState('Q-RAG-2041');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Tất cả trạng thái');
  const [toast, setToast] = useState('');

  const filteredQuestions = useMemo(() => questions.filter((question) => {
    const matchesQuery = `${question.title} ${question.id} ${question.source}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'Tất cả trạng thái'
      || (status === 'AI đề xuất' && question.type === 'ai')
      || (status === 'Chính thức' && question.type === 'official');
    return matchesQuery && matchesStatus;
  }), [questions, query, status]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const approveQuestion = (id) => {
    setQuestions((items) => items.map((item) => item.id === id ? { ...item, type: 'official', used: 0, updated: 'Vừa cập nhật bởi TS. Nguyễn Văn Hùng' } : item));
    notify('Đã duyệt câu hỏi vào ngân hàng');
  };

  const deleteQuestion = (id) => {
    setQuestions((items) => items.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId('Q-OFF-1092');
    notify('Đã xóa câu hỏi khỏi danh sách');
  };

  const exportRubric = () => {
    const content = 'Tiêu chí,Trọng số,Điểm tối đa\nKhái niệm & Hiện tượng,30%,3.0\nSo sánh Phân đoạn & Phân trang,50%,5.0\nGiải pháp khắc phục,20%,2.0';
    const url = URL.createObjectURL(new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rubric-${selectedId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Đã xuất file rubric');
  };

  return (
    <div className="question-page">
      {toast && <div className="toast"><CheckCircleFilled /> {toast}</div>}
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span>HĐH-2025</span><i /> Ngân hàng học liệu</div>
          <h1>Ngân hàng Câu hỏi & Rubric</h1>
          <p>Quản lý câu hỏi vấn đáp, đối chiếu nguồn RAG và chuẩn hóa ma trận chấm điểm.</p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" type="button"><CloudDownloadOutlined /> Nhập từ tài liệu</button>
          <button className="btn btn-primary" type="button" onClick={() => notify('Đã mở biểu mẫu tạo câu hỏi')}><PlusOutlined /> Tạo câu hỏi mới</button>
        </div>
      </section>

      <section className="stats-grid">
        <article><span className="stat-icon blue"><FileTextOutlined /></span><div><small>Tổng câu hỏi</small><strong>248</strong><em>+12 trong tháng này</em></div></article>
        <article><span className="stat-icon violet"><RobotOutlined /></span><div><small>AI đề xuất chờ duyệt</small><strong>18</strong><em>Cần giảng viên xác nhận</em></div></article>
        <article><span className="stat-icon teal"><CheckCircleOutlined /></span><div><small>Đã có Rubric chuẩn</small><strong>224 <b>/ 248</b></strong><em>Đạt 90,3% học liệu</em></div></article>
        <article><span className="stat-icon amber"><ThunderboltOutlined /></span><div><small>Đã dùng trong kỳ thi</small><strong>176</strong><em>Qua 1.420 lượt vấn đáp</em></div></article>
      </section>

      <section className="filter-bar">
        <label className="search-box"><SearchOutlined /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo nội dung, mã câu hỏi, nguồn RAG..." /></label>
        <div className="filter-divider" />
        <label className="select-wrap"><BookOutlined /><select defaultValue="Hệ điều hành"><option>Hệ điều hành</option><option>Cơ sở dữ liệu</option><option>Mạng máy tính</option></select><DownOutlined /></label>
        <label className="select-wrap"><FilterOutlined /><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Tất cả trạng thái</option><option>AI đề xuất</option><option>Chính thức</option></select><DownOutlined /></label>
        <button className="icon-button settings-filter" type="button" aria-label="Thiết lập bộ lọc"><SettingOutlined /></button>
      </section>

      <div className="content-grid">
        <section className="question-column">
          <div className="section-title-row">
            <div><h2>Danh sách câu hỏi</h2><span>{filteredQuestions.length} kết quả đang hiển thị</span></div>
            <button type="button">Sắp xếp: Mới cập nhật <DownOutlined /></button>
          </div>

          {filteredQuestions.length === 0 && <div className="empty-state"><SearchOutlined /><h3>Không tìm thấy câu hỏi</h3><p>Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p></div>}
          {filteredQuestions.map((question) => (
            <article
              key={question.id}
              className={`question-card ${question.id === selectedId ? 'selected' : ''}`}
              onClick={() => setSelectedId(question.id)}
            >
              <div className="card-topline">
                <div className="badge-row">
                  <BloomBadge question={question} />
                  {question.type === 'ai'
                    ? <span className="status-badge ai"><RobotOutlined /> AI đề xuất · Chờ duyệt</span>
                    : <span className="status-badge official"><CheckCircleFilled /> Chính thức</span>}
                  <code>#{question.id}</code>
                </div>
                {question.used !== undefined
                  ? <span className="used-count"><ClockCircleOutlined /> Đã thi {question.used} lượt</span>
                  : <span className="ai-score"><ThunderboltOutlined /> Độ tin cậy RAG 96%</span>}
              </div>

              <div className="question-content">
                <h3>“{question.title}”</h3>
                {question.type === 'ai' ? (
                  <>
                    <div className="source-anchor"><LinkOutlined /><span><b>Nguồn trích xuất RAG:</b> {question.source}.</span><button type="button">Đối chiếu ↗</button></div>
                    <div className="rubric-summary">
                      <div className="summary-head"><span><TableOutlined /> Ma trận Rubric đề xuất (3 Tiêu chí – Tổng 10 điểm)</span><b>Trọng số 100%</b></div>
                      <div className="criterion-grid">
                        <div><small>Tiêu chí 1 (30%)</small><strong>Định nghĩa & Nguyên nhân</strong><span>Nắm vững cơ chế compaction</span></div>
                        <div><small>Tiêu chí 2 (50%)</small><strong>Phân tích so sánh</strong><span>Khác biệt phân đoạn & trang</span></div>
                        <div><small>Tiêu chí 3 (20%)</small><strong>Ví dụ & Giải pháp</strong><span>Minh họa thực tiễn, bộ nhớ ảo</span></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="official-meta"><span><LinkOutlined /> {question.source}</span><i /> <span className="linked"><TableOutlined /> Đã liên kết Rubric chấm điểm</span></div>
                )}
              </div>

              <div className="card-actions">
                {question.type === 'ai' ? (
                  <>
                    <div className="duration"><span>Thời gian vấn đáp dự kiến:</span><b>{question.duration}</b></div>
                    <div>
                      <button className="btn btn-danger" type="button" onClick={(event) => { event.stopPropagation(); deleteQuestion(question.id); }}><CloseOutlined /> Từ chối/Xóa</button>
                      <button className="btn btn-secondary" type="button" onClick={(event) => { event.stopPropagation(); notify('Đã mở trình chỉnh sửa'); }}><EditOutlined /> Chỉnh sửa</button>
                      <button className="btn btn-primary" type="button" onClick={(event) => { event.stopPropagation(); approveQuestion(question.id); }}><CheckCircleOutlined /> Duyệt vào ngân hàng</button>
                    </div>
                  </>
                ) : (
                  <>
                    <small>Cập nhật lần cuối: {question.updated}</small>
                    <div>
                      <button className="icon-button" type="button" aria-label="Xem thống kê"><BarChartOutlined /></button>
                      <button className="icon-button" type="button" aria-label="Chỉnh sửa"><EditOutlined /></button>
                      <button className="btn btn-soft" type="button">Xem chi tiết Rubric</button>
                    </div>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>

        <aside className="rubric-column">
          <div className="rubric-panel">
            <div className="rubric-header">
              <div><h2><TableOutlined /> Ma trận Rubric Chuẩn</h2><p>Đang xem câu hỏi: <code>#{selectedId}</code></p></div>
              <button className="icon-button" type="button" aria-label="Chỉnh sửa Rubric"><SettingOutlined /></button>
            </div>
            <div className="ai-notice"><RobotOutlined /><p><b>Cơ sở đánh giá tự động (LLM Evaluator):</b> Ma trận này được nạp trực tiếp vào prompt thẩm định AI khi sinh viên trả lời trong phòng viva.</p></div>

            <div className="rubric-criterion">
              <div className="criterion-heading"><strong>Tiêu chí 1: Khái niệm & Hiện tượng (30%)</strong><code>Tối đa: 3.0 điểm</code></div>
              {rubricLevels.map((level) => (
                <div className="rubric-level" key={level.label}>
                  <strong className={level.tone}><i /> {level.label}</strong>
                  <p>{level.text}</p>
                </div>
              ))}
            </div>

            <div className="rubric-criterion compact">
              <div className="criterion-heading"><strong>Tiêu chí 2: So sánh Phân đoạn & Phân trang (50%)</strong><code>Tối đa: 5.0 điểm</code></div>
              <p>Chỉ rõ: Phân đoạn kích thước thay đổi dẫn đến phân mảnh ngoài; Phân trang kích thước cố định loại bỏ phân mảnh ngoài nhưng chịu phân mảnh nội ở trang cuối cùng.</p>
              <div className="keywords"><span>Bảng đối chiếu 4 khía cạnh</span><code>Compaction · Paging Table</code></div>
            </div>

            <div className="rubric-criterion compact">
              <div className="criterion-heading"><strong>Tiêu chí 3: Đề xuất giải pháp khắc phục (20%)</strong><code>Tối đa: 2.0 điểm</code></div>
              <p>Trình bày giải pháp dồn bộ nhớ (Memory Compaction) và kiến trúc hiện đại kết hợp: Phân trang cho các phân đoạn.</p>
            </div>

            <div className="rubric-footer">
              <button type="button" onClick={exportRubric}><FileExcelOutlined /> Xuất file Rubric</button>
              <button className="btn btn-soft" type="button" onClick={() => notify('Đã khóa ma trận đánh giá')}><LockOutlined /> Khóa ma trận</button>
            </div>
          </div>

          <div className="test-run-card">
            <span><SoundOutlined /></span>
            <div><strong>Chạy thử nghiệm mô phỏng Viva</strong><small>Kiểm thử giọng nói AI đặt câu hỏi và chấm thử</small></div>
            <button className="btn btn-primary" type="button" onClick={() => notify('Đang khởi tạo phiên test...')}>Mở Test Run</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
