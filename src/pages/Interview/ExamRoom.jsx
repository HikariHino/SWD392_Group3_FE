import React, { useEffect, useMemo, useState } from 'react';
import {
  AudioMutedOutlined,
  AudioOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  EyeOutlined,
  FlagOutlined,
  LoadingOutlined,
  LockOutlined,
  QuestionCircleOutlined,
  RedoOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SoundOutlined,
  ThunderboltOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import './ExamRoom.css';

const waveform = [16, 29, 40, 25, 36, 20, 32, 42, 19, 35, 26, 39, 22, 34, 18, 31, 24, 38, 20];

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function ExamRoom() {
  const [secondsLeft, setSecondsLeft] = useState(135);
  const [recording, setRecording] = useState(true);
  const [question, setQuestion] = useState(3);
  const [replaying, setReplaying] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!recording || secondsLeft <= 0) return undefined;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [recording, secondsLeft]);

  const timePercent = useMemo(() => Math.max(0, Math.round((secondsLeft / 300) * 100)), [secondsLeft]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const replayQuestion = () => {
    setReplaying(true);
    notify('AI đang đọc lại câu hỏi xoáy');
    window.setTimeout(() => setReplaying(false), 1800);
  };

  const completeAnswer = () => {
    if (question >= 5) {
      notify('Bài thi đã hoàn thành và được lưu an toàn');
      setRecording(false);
      return;
    }
    setQuestion((value) => value + 1);
    setSecondsLeft(180);
    setRecording(true);
    notify('Đã lưu câu trả lời, chuyển sang câu tiếp theo');
  };

  return (
    <div className="exam-room-page">
      {toast && <div className="exam-toast"><CheckCircleFilled /> {toast}</div>}

      <header className="exam-header">
        <div className="room-identity">
          <div className="room-code"><i /><code>VIVA-CS301-2025</code><span /> <strong>Phòng 04 · Hệ Điều Hành</strong></div>
          <div className="semester"><CustomerServiceOutlined /> Học kỳ II (2024 – 2025)</div>
        </div>

        <div className="candidate-area">
          <div className="candidate-card">
            <div><strong>Nguyễn Văn An</strong><code>MSSV: 20210456</code></div>
            <div className="camera-avatar"><UserOutlined /><small>CAM</small></div>
          </div>
          <div className="face-status"><EyeOutlined /><div><strong>Giám sát khuôn mặt: Hợp lệ</strong><small>Độ tin cậy 99.4% · Không phát hiện gian lận</small></div></div>
          <button className="exam-icon-button" type="button" aria-label="Báo cáo kỹ thuật" onClick={() => notify('Đã mở trợ giúp kỹ thuật')}><QuestionCircleOutlined /></button>
        </div>
      </header>

      <main className="exam-stage">
        <section className="exam-left-column">
          <article className="exam-panel ai-examiner-panel">
            <div className="examiner-heading">
              <div className="examiner-profile">
                <span className="robot-mark"><RobotOutlined /></span>
                <div><div className="title-line"><h1>Giám khảo AI</h1><span>Oral Evaluator v4.2</span><em>Mô hình GPT-4o Viva</em></div><p>Bộ đề thi: Cấu trúc Bộ nhớ & Bộ nhớ ảo (Virtual Memory)</p></div>
              </div>
              <div className={`listening-pill ${recording ? 'active' : ''}`}><i /> {recording ? 'AI đang lắng nghe sinh viên...' : 'Ghi âm đang tạm dừng'}</div>
            </div>

            <div className={`voice-visualizer ${recording ? '' : 'paused'}`}>
              <div className="waveform" aria-label="Biểu đồ âm thanh trực tiếp">
                {waveform.map((height, index) => <i key={`${height}-${index}`} style={{ '--bar-height': `${height}px`, '--delay': `${(index % 7) * 0.12}s` }} />)}
              </div>
              <div className="audio-meta"><span><ThunderboltOutlined /> Độ trễ mô hình: 128ms</span><i /> <span><SoundOutlined /> Giọng đọc: Tiếng Việt Chuẩn (Neural)</span></div>
            </div>

            <div className="base-question">
              <div><strong><QuestionCircleOutlined /> Câu hỏi gốc #{question.toString().padStart(2, '0')} / 05</strong><span>Bloom: Phân tích (Analyzing)</span></div>
              <p>“Hãy trình bày cơ chế phân trang (Paging) trong việc ánh xạ từ địa chỉ logic sang địa chỉ vật lý, và nêu sự khác biệt căn bản giữa phân mảnh nội (Internal Fragmentation) và phân mảnh ngoại (External Fragmentation)?”</p>
            </div>
          </article>

          <article className="exam-panel adaptive-panel">
            <div className="probe-count"><ThunderboltOutlined /> Lượt hỏi xoáy: 1/2 tối đa</div>
            <div className="adaptive-alert"><WarningOutlined /><div><strong>Kích hoạt AI Adaptive Logic (Hỏi sâu / Làm rõ)</strong><p>Phát hiện câu trả lời của thí sinh chưa đầy đủ hoặc còn mơ hồ ở khái niệm <u>Phân mảnh nội bộ</u> trong cơ chế phân trang cố định → Kích hoạt câu hỏi xoáy (Follow-up 1/2).</p></div></div>
            <div className="probe-question"><strong><AudioOutlined /> Câu hỏi xoáy từ Giám khảo AI:</strong><blockquote>“Em vừa khẳng định việc phân trang giải quyết triệt để phân mảnh. Vậy hiện tượng <mark>phân mảnh nội bộ (Internal Fragmentation)</mark> trong khung trang cuối cùng được hệ điều hành giải quyết như thế nào, và trong trường hợp nào thì kích thước trang nhỏ lại gây bất lợi?”</blockquote></div>
            <div className="probe-meta"><div><span><FlagOutlined /> Trọng số câu hỏi: +20% điểm</span><i /> <span>Độ phức tạp: Mức 4 (Đánh giá chuyên sâu)</span></div><button type="button" onClick={replayQuestion}>{replaying ? <LoadingOutlined spin /> : <SoundOutlined />} Nghe lại câu hỏi xoáy</button></div>
          </article>
        </section>

        <section className="exam-right-column">
          <article className="exam-panel countdown-card">
            <div className="countdown-heading"><strong><ClockCircleOutlined /> Thời gian trả lời câu hỏi xoáy</strong><div className={secondsLeft < 60 ? 'urgent' : ''}><code>{formatTime(secondsLeft)}</code><span>còn lại</span></div></div>
            <div className="time-track"><i style={{ width: `${timePercent}%` }} /></div>
            <div className="time-notes"><span>Tổng thời lượng phòng thi: 18:45 / 30:00</span><strong>Cảnh báo: {timePercent}% thời gian cho câu này</strong></div>
          </article>

          <article className="exam-panel transcript-panel">
            <div className="transcript-heading"><h2><AudioOutlined /> Bản ghi âm trực tiếp <span>(Real-time Speech-to-Text)</span></h2><div className={recording ? 'active' : ''}><i /> STT: {recording ? 'Hoạt động (Mic Active)' : 'Tạm dừng'}</div></div>

            <div className="transcript-stream">
              <div className="transcript-block"><code>Thí sinh [00:42]:</code><p>“Dạ thưa Giám khảo, em xin trả lời về phân mảnh nội bộ. Khi một tiến trình được cấp phát các trang nhớ, nếu kích thước tiến trình không phải là bội số của <u>Page Size</u>, thì trang cuối cùng chỉ chứa một phần dữ liệu, phần còn lại bị bỏ trống và gọi là <mark>Internal Fragmentation</mark>...”</p></div>
              <div className="transcript-block live"><code>Thí sinh [{recording ? 'Đang phát biểu · Real-time' : 'Đã tạm dừng'}]:</code><p>“Để giải quyết thì hệ điều hành không thể chia nhỏ trang thêm trong phần cứng chuẩn, nhưng có thể tối ưu bằng cách giảm kích thước trang từ 8KB xuống 4KB. Tuy nhiên nếu chọn <u>Page Size</u> quá nhỏ thì <u>Page Table</u> sẽ tăng kích thước, chiếm dụng bộ nhớ RAM và làm tăng chi phí tra cứu bảng <u>Offset</u>...” {recording && <span className="typing-cursor" />}</p></div>
            </div>

            <div className="keyword-section">
              <div><span>Từ khóa thực thể kỹ thuật đã bắt được:</span><strong>4 / 5 Tiêu chuẩn</strong></div>
              <div className="keyword-list"><span><CheckCircleFilled /> Page Table</span><span><CheckCircleFilled /> Internal Fragmentation</span><span><CheckCircleFilled /> Page Size & Offset</span><span className="missing"><i /> TLB Miss (Chưa nhắc)</span></div>
            </div>

            <div className="exam-controls">
              <div>
                <button className={`control-button ${recording ? 'recording' : ''}`} type="button" onClick={() => setRecording((value) => !value)}>{recording ? <AudioOutlined /> : <AudioMutedOutlined />} {recording ? 'Tạm dừng ghi âm' : 'Tiếp tục ghi âm'}</button>
                <button className="control-button" type="button" onClick={replayQuestion}>{replaying ? <LoadingOutlined spin /> : <RedoOutlined />} AI nhắc lại câu hỏi</button>
              </div>
              <button className="complete-button" type="button" onClick={completeAnswer}><CheckOutlined /> {question >= 5 ? 'Hoàn thành bài thi' : 'Hoàn thành câu trả lời (Chuyển câu tiếp theo)'}</button>
            </div>
          </article>
        </section>
      </main>

      <footer className="exam-footer">
        <div><span><i /> Băng thông WebRTC: 48kbps (Ổn định)</span><b>·</b><span><LockOutlined /> Phiên thi được mã hóa E2E & lưu trữ đối chiếu Hội đồng Khảo thí</span></div>
        <div><strong>Tiến độ thi: {question}/5 câu hỏi</strong><span className="overall-progress"><i style={{ width: `${(question / 5) * 100}%` }} /></span><SafetyCertificateOutlined /></div>
      </footer>
    </div>
  );
}
