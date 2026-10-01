import React, { useMemo, useState } from 'react';
import {
  ArrowRightOutlined,
  AuditOutlined,
  AudioOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  InfoCircleOutlined,
  MinusOutlined,
  PauseOutlined,
  PlayCircleFilled,
  PlusOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SoundOutlined,
  UserOutlined,
} from '@ant-design/icons';
import './GradingDashboard.css';

const rubricItems = [
  { title: 'Nắm vững khái niệm cốt lõi', meta: 'Trọng số: 30% · Bloom: Hiểu & Ghi nhớ', score: 2.8, max: 3, text: 'Thí sinh định nghĩa chính xác phân trang, phân biệt mạch lạc giữa trang logic và khung trang vật lý, giải thích đúng cơ chế loại bỏ phân mảnh ngoại vi.' },
  { title: 'Phản hồi câu hỏi xoáy / Chiều sâu hiểu biết', meta: 'Trọng số: 40% · Bloom: Phân tích sâu', score: 3.5, max: 4, text: 'Giải thích tốt cơ chế offset nhưng chưa nêu rõ tác động của page size đối với hiệu năng bộ nhớ cache TLB. Có sự ngập ngừng 3.2 giây khi trả lời.' },
  { title: 'Khả năng lập luận & Diễn đạt', meta: 'Trọng số: 30% · Bloom: Đánh giá & Trình bày', score: 2.2, max: 3, text: 'Tốc độ nói ổn định, phát âm thuật ngữ chuyên ngành tiếng Anh chính xác. Giọng tự tin, không có hành vi nghi vấn.' },
];

export default function GradingDashboard() {
  const [score, setScore] = useState(8.5);
  const [notes, setNotes] = useState('Đồng ý với đánh giá của AI. Thí sinh nắm vững bản chất MMU và bảng phân trang. Phần trả lời câu hỏi xoáy phản xạ tốt dù có ngập ngừng ngắn.');
  const [playing, setPlaying] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [toast, setToast] = useState('');
  const [progress, setProgress] = useState(66);

  const scoreChanged = useMemo(() => score !== 8.5, [score]);
  const updateScore = (value) => setScore(Math.min(10, Math.max(0, Math.round(value * 100) / 100)));
  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2300);
  };
  const toggleAudio = () => {
    setPlaying((value) => !value);
    notify(playing ? 'Đã tạm dừng bản ghi' : 'Đang phát bản ghi từ 00:00');
  };
  const saveGrade = () => {
    if (scoreChanged && !notes.trim()) {
      notify('Vui lòng nhập nhận xét khi thay đổi điểm AI');
      return;
    }
    setProgress(100);
    notify('Đã xác nhận và lưu bảng điểm chính thức');
  };

  return (
    <div className="grading-page">
      {toast && <div className="grading-toast"><CheckCircleFilled /> {toast}</div>}

      <section className="candidate-strip">
        <div className="candidate-summary">
          <span className="student-avatar"><UserOutlined /><i /></span>
          <div>
            <div className="student-title"><h1>Nguyễn Văn An</h1><code>MSSV: 20214892</code><span><i style={{ width: `${progress}%` }} />Đã thẩm định {progress === 100 ? '3/3' : '2/3'} câu</span></div>
            <div className="student-meta"><span>Bài thi: <b>Kiến trúc Bộ nhớ</b></span><span><ClockCircleOutlined /> Nộp lúc 10:45 · 24/10/2025</span><span>Thời lượng: 14 phút 20 giây</span></div>
          </div>
        </div>
        <div className="ai-score-summary"><div><small>Điểm AI sơ bộ</small><strong>8.5 <span>/ 10.0</span></strong></div><i /><div><b><SafetyCertificateOutlined /> Độ tin cậy AI: 94%</b><small>Không phát hiện gian lận</small></div></div>
      </section>

      <div className="grading-workspace">
        <section className="transcript-column">
          <article className="grading-card transcript-card">
            <div className="grading-card-title">
              <h2><AudioOutlined /> Biên bản đàm thoại song hành <span>(Transcript)</span></h2>
              <div className="audio-player"><button type="button" onClick={toggleAudio}>{playing ? <PauseOutlined /> : <PlayCircleFilled />}</button><span className="audio-line"><i className={playing ? 'playing' : ''} /></span><code>{playing ? '02:18' : '00:00'} / 04:05</code><SoundOutlined /></div>
            </div>

            <div className="transcript-timeline">
              <div className="timeline-item ai-line">
                <span className="timeline-icon"><RobotOutlined /></span>
                <div><header><strong>Giám khảo AI đặt câu hỏi</strong><code>[00:05 – 00:42]</code><button type="button"><SoundOutlined /> Nghe lại (37s)</button></header><p>“Hãy trình bày cơ chế phân trang trong việc ánh xạ từ địa chỉ logic sang địa chỉ vật lý. Vì sao kỹ thuật này giải quyết được vấn đề <em>phân mảnh ngoại vi (External Fragmentation)</em>?”</p></div>
              </div>

              <div className="timeline-item student-line">
                <span className="timeline-icon"><UserOutlined /></span>
                <div><header><strong>Sinh viên trả lời</strong><code>[00:48 – 02:10]</code><span>Tốc độ: 142 từ/phút</span></header><p>“Thưa thầy, kỹ thuật phân trang chia không gian địa chỉ logic thành các khối kích thước bằng nhau gọi là <mark>Trang (Pages)</mark>, và bộ nhớ vật lý được chia thành các <mark>Khung trang (Page Frames)</mark>. Mỗi trang logic có thể ánh xạ vào bất kỳ khung trống qua <mark>Bảng phân trang (Page Table)</mark>, nên bộ nhớ không cần liên tục và phân mảnh ngoại vi được triệt tiêu. Tuy nhiên vẫn tồn tại <u>phân mảnh nội vi</u> ở trang cuối.”</p></div>
              </div>

              <div className="timeline-item followup-line">
                <span className="timeline-icon"><RobotOutlined /></span>
                <div><header><strong>Câu hỏi xoáy AI (Adaptive Follow-up)</strong><code>[02:15 – 02:40]</code><span>Bloom: Phân tích & Đánh giá</span></header><p>“Tốt. Em đã đề cập đến Bảng phân trang. Hãy phân tích cách phần cứng MMU sử dụng <b>Page Number (p)</b> và <b>Offset (d)</b>? Nếu tăng gấp đôi Page Size thì kích thước bảng phân trang và phân mảnh nội vi thay đổi thế nào?”</p></div>
              </div>

              <div className="timeline-item student-line">
                <span className="timeline-icon"><UserOutlined /></span>
                <div><header><strong>Sinh viên phản hồi làm rõ</strong><code>[02:45 – 04:05]</code><span className="hesitation">Độ trễ phản xạ: 3.2s</span></header><p>“MMU lấy <mark>Page Number làm chỉ số</mark> tra vào bảng phân trang để tìm Frame Number. Sau đó ghép Frame Number với <mark>Offset giữ nguyên</mark> để tạo địa chỉ vật lý. Khi tăng Page Size gấp đôi, bảng phân trang giảm vì số trang ít đi, còn <u>phân mảnh nội vi sẽ tăng trung bình theo kích thước trang</u>.”</p><aside><InfoCircleOutlined /> AI phát hiện: Do dự nhẹ lúc 03:22, độ chính xác logic đạt 88%.<button type="button" onClick={() => { setFlagged(true); notify('Đã gắn cờ đoạn cần kiểm tra'); }}>{flagged ? 'Đã gắn cờ' : 'Gắn cờ kiểm tra lại'}</button></aside></div>
              </div>
            </div>
          </article>
        </section>

        <section className="evaluation-column">
          <article className="grading-card signal-card">
            <h2><SoundOutlined /> Tín hiệu phụ trợ phỏng vấn <span>(Auxiliary Signals)</span></h2>
            <div><section><small>Thời gian phản hồi</small><strong>3.2<span>s</span></strong><em>Bình thường</em></section><section><small>Độ trôi chảy</small><strong>88<span>%</span></strong><em>Mạch lạc</em></section><section><small>Tỷ lệ do dự</small><strong>5<span>%</span></strong><em>Mức thấp</em></section></div>
          </article>

          <article className="grading-card rubric-card">
            <div className="rubric-title"><div><h2><CheckOutlined /> Ma trận Rubric tự động đối chiếu bởi AI</h2><p>Đề xuất dựa trên văn bản và âm phổ</p></div><strong>AI Sum: 8.5/10</strong></div>
            <div className="rubric-items">
              {rubricItems.map((item, index) => <section key={item.title}><div><span><b>{index + 1}. {item.title}</b><small>{item.meta}</small></span><strong>{item.score}<small>/ {item.max.toFixed(1)}</small></strong></div><p><b>Giải trình AI:</b> “{item.text}”</p></section>)}
            </div>
          </article>

          <article className="grading-card override-card">
            <div className="override-title"><h2><AuditOutlined /> Quyết định của Giám khảo</h2><span>Quyền quyết định tối hậu</span></div>
            <div className="score-override"><div><small>AI gợi ý sơ bộ</small><strong>8.5 <span>/ 10.0</span></strong></div><ArrowRightOutlined /><label htmlFor="override-score"><span>Giảng viên chốt điểm:</span><div><input id="override-score" type="number" min="0" max="10" step="0.1" value={score} onChange={(event) => updateScore(Number(event.target.value))} /><strong>/ 10</strong></div></label></div>
            <label className="notes-label" htmlFor="faculty-notes"><span>Nhận xét thẩm định của Giảng viên:<small>{scoreChanged ? 'Bắt buộc vì đã thay đổi điểm AI' : 'Có thể bổ sung phản hồi'}</small></span><textarea id="faculty-notes" rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Nhập ghi chú phản hồi cho thí sinh hoặc hội đồng khảo thí..." /></label>
            <div className="quick-adjust"><button type="button" onClick={() => updateScore(score + .25)}><PlusOutlined /> 0.25 (Thưởng tư duy)</button><button type="button" onClick={() => updateScore(score - .5)}><MinusOutlined /> 0.5 (Trừ ngập ngừng)</button><button type="button" onClick={() => updateScore(8.5)}>Khôi phục điểm gốc</button></div>
            <div className="override-actions"><button className="save-grade" type="button" onClick={saveGrade}><CheckCircleFilled /> Xác nhận & Lưu bảng điểm chính thức</button><button className={`appeal-button ${flagged ? 'active' : ''}`} type="button" onClick={() => { setFlagged(true); notify('Đã gửi yêu cầu Hội đồng xem xét'); }}><FlagOutlined /> Phúc khảo / Hội đồng</button></div>
          </article>
        </section>
      </div>
    </div>
  );
}
