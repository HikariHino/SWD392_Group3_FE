import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Input, Spin, Typography } from 'antd';
import {
  AudioMutedOutlined,
  AudioOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CloudSyncOutlined,
  DisconnectOutlined,
  FileTextOutlined,
  LoadingOutlined,
  LockOutlined,
  LoginOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  RobotOutlined,
  SendOutlined,
  ThunderboltOutlined,
  UserOutlined,
  WarningOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import useExamAttempt from '../../hooks/useExamAttempt';
import {
  answersOf,
  countAnswered,
  followUpsOf,
  formatElapsed,
  MAX_ANSWER_LENGTH,
  MAX_FOLLOW_UPS,
  parseSessionId,
} from '../../utils/examFlow';
import './ExamRoom.css';

const CONNECTION_STATES = {
  idle: { label: 'Chưa kết nối', icon: <DisconnectOutlined /> },
  connecting: { label: 'Đang kết nối...', icon: <LoadingOutlined spin /> },
  connected: { label: 'Đã kết nối', icon: <WifiOutlined /> },
  reconnecting: { label: 'Đang nối lại...', icon: <CloudSyncOutlined spin /> },
  disconnected: { label: 'Mất kết nối', icon: <DisconnectOutlined /> },
};

const formatClock = (value) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function ConnectionBadge({ status, onReconnect }) {
  const { label, icon } = CONNECTION_STATES[status];
  return (
    <div className={`connection-badge ${status}`} role="status">
      {icon}<span>{label}</span>
      {status === 'disconnected' && <button type="button" onClick={onReconnect}>Kết nối lại</button>}
    </div>
  );
}

function ExamHeader({ sessionId, status, onReconnect }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  return (
    <header className="exam-header">
      <div className="room-code"><i className={status} /><strong>Phòng thi vấn đáp</strong>{sessionId && <><span /><code>Mã ca {sessionId.slice(0, 8).toUpperCase()}</code></>}</div>
      <div className="candidate-area">
        {status && <ConnectionBadge status={status} onReconnect={onReconnect} />}
        <div className="candidate-card">
          <div><strong>{user?.fullName || user?.username}</strong><code>{user?.username}</code></div>
          <div className="camera-avatar"><UserOutlined /></div>
        </div>
        <button className="exam-icon-button" type="button" aria-label="Đăng xuất" title="Đăng xuất" onClick={handleLogout}><LogoutOutlined /></button>
      </div>
    </header>
  );
}

function ElapsedCard({ startedAt, endTime }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <article className="exam-panel countdown-card">
      <div className="countdown-heading">
        <strong><ClockCircleOutlined /> {endTime ? 'Thời gian còn lại' : 'Thời gian đã làm bài'}</strong>
        <code>{formatElapsed(endTime ? Math.max(0, Math.ceil((Date.parse(endTime) - now) / 1000)) : Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000)))}</code>
      </div>
      <p className="time-notes">Bắt đầu lúc {formatClock(startedAt)}. {endTime ? `Ca kết thúc lúc ${formatClock(endTime)}.` : 'Nếu ca thi đã hết giờ, hệ thống sẽ báo khi bạn gửi câu trả lời.'}</p>
    </article>
  );
}

function TranscriptPanel({ turns, questions, pendingText }) {
  const streamRef = useRef(null);
  useEffect(() => {
    const stream = streamRef.current;
    if (stream) stream.scrollTop = stream.scrollHeight;
  }, [turns.length, pendingText]);

  const questionNumber = (questionId) => questions.findIndex((question) => question.questionId === questionId) + 1;

  return (
    <article className="exam-panel transcript-panel">
      <div className="transcript-heading">
        <h2><FileTextOutlined /> Bản ghi buổi thi</h2>
        <span>{turns.length} lượt đã lưu</span>
      </div>
      <div className="transcript-stream" ref={streamRef} aria-live="polite">
        {turns.length === 0 && !pendingText && <p className="transcript-empty">Câu trả lời và câu hỏi xoáy sẽ hiện ở đây sau khi được lưu.</p>}
        {turns.map((turn) => (
          <div className={`transcript-block ${turn.speaker === 'AI' ? 'ai' : ''}`} key={turn.id}>
            <code>{turn.speaker === 'AI' ? 'Giám khảo AI' : 'Bạn'}{turn.questionId ? ` · Câu ${questionNumber(turn.questionId)}` : ''} · {formatClock(turn.timestamp)}</code>
            <p>{turn.contentText}</p>
          </div>
        ))}
        {pendingText && (
          <div className="transcript-block live">
            <code><LoadingOutlined spin /> Đang gửi...</code>
            <p>{pendingText}</p>
          </div>
        )}
      </div>
    </article>
  );
}

function examinerState(step, awaitingReply, answered) {
  if (step === 'sending') return 'Đang lưu câu trả lời...';
  if (step === 'waiting-ai') return 'Giám khảo đang đọc câu trả lời...';
  if (step === 'submitting') return 'Đang nộp bài...';
  if (awaitingReply) return 'Mời bạn trả lời câu hỏi xoáy';
  return answered ? 'Câu trả lời đã được lưu' : 'Mời bạn trả lời';
}

function CenteredState({ sessionId, children }) {
  return (
    <div className="exam-room-page">
      <ExamHeader sessionId={sessionId} />
      <main className="exam-center"><article className="exam-panel exam-center-card">{children}</article></main>
    </div>
  );
}

function FinishedView({ sessionId, attempt, questions, turns }) {
  return (
    <div className="exam-room-page">
      <ExamHeader sessionId={sessionId} />
      <main className="exam-stage finished">
        <section className="exam-left-column">
          <article className="exam-panel exam-center-card">
            <CheckCircleFilled className="result-icon success" />
            <h1>Bài thi đã được ghi nhận</h1>
            <p>{attempt.submittedAt ? `Nộp lúc ${new Date(attempt.submittedAt).toLocaleString('vi-VN')}.` : 'Bài thi đã kết thúc.'} Giảng viên sẽ xem lại trước khi công bố kết quả.</p>
            <p>Mã lượt thi (gửi giảng viên để thẩm định):<br /><Typography.Text copyable={{ text: attempt.id }} style={{ overflowWrap: 'anywhere' }}>{attempt.id}</Typography.Text></p>
            <div className="finished-stats">
              <div><strong>{countAnswered(questions, turns)}/{questions.length}</strong><span>Câu đã trả lời</span></div>
              <div><strong>{turns.filter((turn) => turn.speaker === 'AI').length}</strong><span>Câu hỏi xoáy</span></div>
            </div>
            <Link className="btn btn-secondary" to="/exam-room"><LoginOutlined /> Vào ca thi khác</Link>
          </article>
        </section>
        <section className="exam-right-column"><TranscriptPanel turns={turns} questions={questions} pendingText="" /></section>
      </main>
    </div>
  );
}

function ActiveRoom({ sessionId, exam }) {
  const { modal } = App.useApp();
  const { attempt, questions, question, questionIndex, turns, draft, pendingText, step, notice, windowClosed, connection } = exam;
  const recorder = useAudioRecorder({ onText: exam.appendDraft });
  const { cancelRecording } = recorder;

  const { questionId } = question;
  const followUps = followUpsOf(turns, questionId);
  const answered = answersOf(turns, questionId).length > 0;
  const lastTurn = turns.at(-1);
  const awaitingReply = lastTurn?.speaker === 'AI' && lastTurn.questionId === questionId;
  const latestFollowUp = followUps.at(-1);
  const answeredCount = countAnswered(questions, turns);
  const isLastQuestion = questionIndex === questions.length - 1;
  const busy = step !== 'idle';
  const canSend = !busy && !windowClosed && (draft.trim() || recorder.interimText.trim());
  const showFollowUpPanel = latestFollowUp || step === 'waiting-ai' || notice?.action === 'follow-up';

  useEffect(() => cancelRecording, [cancelRecording, questionId]);

  const handleSend = () => {
    if (!canSend) return;
    const spoken = recorder.interimText;
    cancelRecording();
    exam.sendAnswer(spoken);
  };

  const handleNext = () => {
    if (!draft.trim()) {
      exam.nextQuestion();
      return;
    }
    modal.confirm({
      title: 'Bạn còn câu trả lời chưa gửi',
      content: 'Nếu chuyển câu, nội dung đang soạn sẽ không được lưu.',
      okText: 'Vẫn chuyển câu',
      cancelText: 'Ở lại',
      onOk: exam.nextQuestion,
    });
  };

  const handleSubmit = () => {
    const unanswered = questions.length - answeredCount;
    modal.confirm({
      title: 'Nộp bài thi?',
      content: [
        unanswered > 0 ? `Còn ${unanswered} câu chưa trả lời.` : 'Bạn đã trả lời tất cả câu hỏi.',
        draft.trim() ? 'Nội dung đang soạn chưa gửi sẽ không được lưu.' : '',
        'Sau khi nộp sẽ không sửa được bài.',
      ].filter(Boolean).join(' '),
      okText: 'Nộp bài',
      cancelText: 'Làm tiếp',
      onOk: exam.submit,
    });
  };

  return (
    <div className="exam-room-page">
      <ExamHeader sessionId={sessionId} status={connection.status} onReconnect={connection.reconnect} />

      {connection.status === 'reconnecting' && <Alert banner type="warning" title="Kết nối thời gian thực bị gián đoạn, đang thử nối lại. Bạn vẫn có thể gửi câu trả lời." />}
      {connection.status === 'disconnected' && <Alert banner type="error" title="Không kết nối được kênh thời gian thực. Câu trả lời vẫn được lưu, câu hỏi xoáy sẽ lấy qua API nên có thể chậm hơn." />}
      {windowClosed && <Alert banner type="error" title="Ca thi không còn nhận câu trả lời. Những gì đã gửi đều được lưu, hãy nộp bài." action={<button className="btn btn-primary" type="button" disabled={busy} onClick={exam.submit}>Nộp bài</button>} />}

      <main className="exam-stage">
        <section className="exam-left-column">
          <article className="exam-panel ai-examiner-panel">
            <div className="examiner-heading">
              <div className="examiner-profile">
                <span className="robot-mark"><RobotOutlined /></span>
                <div><h1>Giám khảo AI</h1><p>Câu {questionIndex + 1} / {questions.length} · {question.points} điểm</p></div>
              </div>
              <div className={`listening-pill ${busy ? 'active' : ''}`}><i /> {examinerState(step, awaitingReply, answered)}</div>
            </div>
            <div className="base-question">
              <strong><QuestionCircleOutlined /> Câu hỏi {questionIndex + 1}</strong>
              <p>{question.content}</p>
            </div>
          </article>

          {showFollowUpPanel && (
            <article className="exam-panel adaptive-panel">
              <div className="probe-count"><ThunderboltOutlined /> Hỏi xoáy {followUps.length}/{MAX_FOLLOW_UPS}</div>
              {latestFollowUp && <div className="probe-question"><strong><RobotOutlined /> Câu hỏi xoáy từ Giám khảo AI</strong><blockquote>{latestFollowUp.contentText}</blockquote></div>}
              {step === 'waiting-ai' && <p className="probe-waiting"><LoadingOutlined spin /> Giám khảo đang chuẩn bị câu hỏi xoáy...</p>}
              {notice?.action === 'follow-up' && (
                <div className="adaptive-alert" role="alert">
                  <WarningOutlined />
                  <div><strong>Chưa lấy được câu hỏi xoáy</strong><p>{notice.message} Câu trả lời của bạn đã được lưu, bạn có thể thử lại hoặc đi tiếp.</p></div>
                  {!windowClosed && <button type="button" onClick={exam.retryFollowUp}><ReloadOutlined /> Thử lại</button>}
                </div>
              )}
            </article>
          )}

          <article className="exam-panel composer-panel">
            <label className="composer-label" htmlFor="exam-answer">{awaitingReply ? 'Câu trả lời cho câu hỏi xoáy' : 'Câu trả lời của bạn'}</label>
            <Input.TextArea
              id="exam-answer"
              value={draft}
              onChange={(event) => exam.setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) handleSend();
              }}
              autoSize={{ minRows: 4, maxRows: 9 }}
              maxLength={MAX_ANSWER_LENGTH}
              disabled={busy || windowClosed}
              placeholder="Nhập câu trả lời hoặc bấm Trả lời bằng giọng nói..."
            />
            {recorder.interimText && <p className="composer-interim">{recorder.interimText}<span className="typing-cursor" /></p>}
            <div className="composer-meta">
              <span>{recorder.supported ? 'Ctrl + Enter để gửi' : 'Trình duyệt này không nhận giọng nói, hãy gõ câu trả lời. Ctrl + Enter để gửi'}</span>
              <span>{draft.length.toLocaleString('vi-VN')} / {MAX_ANSWER_LENGTH.toLocaleString('vi-VN')}</span>
            </div>
            {recorder.error && <Alert type="warning" showIcon title={recorder.error} />}
            {notice && notice.action !== 'follow-up' && <Alert type="error" showIcon role="alert" title={notice.message} description={notice.action === 'send' ? 'Nội dung vẫn còn trong ô trả lời. Bấm gửi lại sẽ không tạo câu trả lời trùng.' : undefined} />}
            <div className="exam-controls">
              {recorder.supported && (
                <button className={`control-button ${recorder.isRecording ? 'recording' : ''}`} type="button" disabled={busy || windowClosed} onClick={recorder.isRecording ? recorder.stopRecording : recorder.startRecording}>
                  {recorder.isRecording ? <AudioMutedOutlined /> : <AudioOutlined />} {recorder.isRecording ? 'Dừng ghi âm' : 'Trả lời bằng giọng nói'}
                </button>
              )}
              <button className="complete-button" type="button" disabled={!canSend} onClick={handleSend}>
                {step === 'sending' ? <LoadingOutlined spin /> : <SendOutlined />} {step === 'sending' ? 'Đang gửi...' : 'Gửi câu trả lời'}
              </button>
            </div>
          </article>
        </section>

        <section className="exam-right-column">
          <ElapsedCard startedAt={attempt.startedAt} endTime={attempt.sessionEndTime} />
          <TranscriptPanel turns={turns} questions={questions} pendingText={pendingText} />
          <article className="exam-panel exam-actions">
            {!isLastQuestion && <button className="control-button" type="button" disabled={busy || !answered} title={answered ? undefined : 'Hãy gửi câu trả lời trước khi chuyển câu'} onClick={handleNext}>Câu tiếp theo <RightOutlined /></button>}
            <button className={isLastQuestion ? 'complete-button' : 'control-button'} type="button" disabled={busy} onClick={handleSubmit}>
              {step === 'submitting' ? <LoadingOutlined spin /> : <CheckOutlined />} Nộp bài
            </button>
          </article>
        </section>
      </main>

      <footer className="exam-footer">
        <span><LockOutlined /> Mỗi câu trả lời được lưu trên máy chủ ngay khi gửi</span>
        <div><strong>Đã trả lời {answeredCount}/{questions.length} câu</strong><span className="overall-progress"><i style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></span></div>
      </footer>
    </div>
  );
}

function ExamSession({ sessionId }) {
  const exam = useExamAttempt(sessionId);

  if (exam.phase === 'loading') {
    return <CenteredState sessionId={sessionId}><Spin size="large" /><h1>Đang vào phòng thi...</h1><p>Hệ thống đang tải câu hỏi và bản ghi của bạn.</p></CenteredState>;
  }
  if (exam.phase === 'error') {
    return (
      <CenteredState sessionId={sessionId}>
        <WarningOutlined className="result-icon warning" />
        <h1>Chưa vào được phòng thi</h1>
        <p role="alert">{exam.loadError}</p>
        <div className="center-actions">
          <button className="btn btn-primary" type="button" onClick={exam.reload}><ReloadOutlined /> Thử lại</button>
          <Link className="btn btn-secondary" to="/exam-room">Nhập mã khác</Link>
        </div>
      </CenteredState>
    );
  }
  if (exam.phase === 'finished') {
    return <FinishedView sessionId={sessionId} attempt={exam.attempt} questions={exam.questions} turns={exam.turns} />;
  }
  return <ActiveRoom sessionId={sessionId} exam={exam} />;
}

export default function ExamRoom() {
  const { sessionId } = useParams();
  const parsedId = parseSessionId(sessionId);
  if (!parsedId) return <Navigate to="/exam-room" replace />;
  return <ExamSession key={parsedId} sessionId={parsedId} />;
}

export { ExamHeader };
