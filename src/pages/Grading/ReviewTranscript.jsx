import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Card, Empty, Input, Progress, Space, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, AuditOutlined, CheckCircleOutlined, FileTextOutlined, ReloadOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import useGradingReview from '../../hooks/useGradingReview';
import { attemptDuration, displayScore, gradePayload, GRADING_STATUSES, hasGradeChanges, initialGradeDraft, isFinalized, validateGradeDraft } from '../../utils/gradingFlow';
import { formatElapsed } from '../../utils/examFlow';

const dateTime = (value) => value ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`).toLocaleString('vi-VN') : '—';

function Transcript({ questions, turns, startedAt }) {
    const [filter, setFilter] = useState('all');
    const visible = filter === 'all' ? turns : turns.filter((turn) => turn.questionId === filter);
    return (
        <Card title={<><FileTextOutlined /> Transcript đầy đủ</>} className="transcript-card"
            extra={<Tag>{turns.length} lượt hội thoại</Tag>}>
            <label className="field-label" htmlFor="transcript-filter">Lọc theo câu hỏi</label>
            <select id="transcript-filter" className="grading-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">Toàn bộ bài thi</option>
                {questions.map((question, index) => <option key={question.questionId} value={question.questionId}>Câu {index + 1}</option>)}
            </select>
            {visible.length === 0 ? <Empty description="Chưa có lượt hội thoại cho lựa chọn này." /> : (
                <div className="review-timeline">
                    {visible.map((turn) => {
                        const index = questions.findIndex((question) => question.questionId === turn.questionId);
                        const seconds = Math.max(0, Math.floor((Date.parse(turn.timestamp) - Date.parse(startedAt)) / 1000));
                        const student = turn.speaker === 'Student';
                        return <article key={turn.id} className={`review-turn ${student ? 'student' : 'ai'}`}>
                            <header><span>{student ? <UserOutlined /> : <RobotOutlined />} <strong>{student ? 'Sinh viên trả lời' : 'AI hỏi xoáy'}</strong></span>
                                <span className="muted-text">{index >= 0 ? `Câu ${index + 1} · ` : ''}#{turn.sequence}{Number.isFinite(seconds) ? ` · ${formatElapsed(seconds)}` : ''}</span></header>
                            <p className="preserve-lines">{turn.contentText}</p>
                        </article>;
                    })}
                </div>
            )}
            <p className="muted-text">Các câu hỏi gốc được lưu trong đề thi bên dưới. Mốc thời gian là lúc ghi nhận lượt hội thoại, không phải thời lượng nói.</p>
            <details className="original-questions"><summary>Đề thi gốc · {questions.length} câu</summary>
                {questions.map((question, index) => <section key={question.questionId}><strong>Câu {index + 1} · {displayScore(question.points)} điểm</strong><p className="preserve-lines">{question.content}</p></section>)}
            </details>
        </Card>
    );
}

function Rubric({ course }) {
    return <Card title="Rubric môn học · Tham khảo" className="rubric-card">
        <p className="muted-text">Rubric hiện tại từ môn học. API chưa cung cấp bản chụp rubric/đáp án dùng khi chấm và điểm AI theo từng tiêu chí; rubric này có thể đã thay đổi so với lúc mở ca.</p>
        {course?.rubrics?.length ? <div className="review-rubrics">{course.rubrics.map((item) => (
            <section key={item.id}><strong className="preserve-lines">{item.criteria}</strong><span>Trọng số {displayScore(item.weight)}% · Tối đa {displayScore(item.maxScore)} điểm tiêu chí</span></section>
        ))}</div> : <Empty description={course ? 'Môn học hiện chưa có rubric.' : 'Chưa tải được rubric môn học.'} />}
    </Card>;
}

export default function ReviewTranscript({ attemptId }) {
    const review = useGradingReview(attemptId);
    const { data, loading, busy, error, notice, stale } = review;
    const navigate = useNavigate();
    const { modal } = App.useApp();
    const [selectedId, setSelectedId] = useState(null);
    const [drafts, setDrafts] = useState({});
    const [validation, setValidation] = useState('');
    const assessments = data?.result.assessments ?? [];
    const dirty = assessments.some((item) => drafts[item.id] && hasGradeChanges(drafts[item.id], item));
    const disabled = loading || Boolean(busy);

    useEffect(() => {
        if (!dirty) return;
        const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const confirmDiscard = (action) => {
        if (!dirty) return action();
        modal.confirm({ title: 'Bỏ thay đổi chưa chốt?', content: 'Điểm và nhận xét đang sửa chưa được lưu lên máy chủ.', okText: 'Bỏ thay đổi', cancelText: 'Tiếp tục sửa', onOk: action });
    };
    const reload = () => confirmDiscard(async () => {
        if (await review.reload()) { setDrafts({}); setValidation(''); }
    });
    const heading = <div className="workspace-heading"><div>
        <span className="page-kicker">AIVES · THẨM ĐỊNH CHẤM ĐIỂM</span><h1>Giảng viên quyết định điểm cuối cùng</h1>
        <Typography.Text className="grading-id" copyable={{ text: attemptId }}>Mã lượt thi: {attemptId}</Typography.Text>
    </div><Space wrap><Button icon={<ArrowLeftOutlined />} disabled={disabled} onClick={() => confirmDiscard(() => navigate('/grading'))}>Mở bài khác</Button>
        <Button icon={<ReloadOutlined />} loading={loading} disabled={Boolean(busy)} onClick={reload}>Tải lại</Button></Space></div>;

    if (!data) return <div className="workspace-page grading-page">{heading}{loading ? <div className="grading-loading"><Spin size="large" /><p>Đang tải bài thi và transcript...</p></div>
        : <Alert showIcon type="error" title={error || 'Chưa tải được bài thi.'} action={<Button onClick={reload}>Thử lại</Button>} />}</div>;

    const { attempt, questions, turns, result, session, student, course } = data;
    const question = questions.find((item) => item.questionId === selectedId) ?? questions[0];
    const assessment = assessments.find((item) => item.questionId === question?.questionId);
    const draft = assessment ? (drafts[assessment.id] ?? initialGradeDraft(assessment)) : null;
    const finalized = isFinalized(assessment);
    const canFinalize = assessment && !finalized && result.status === 'AwaitingReview' && !disabled && !stale;
    const completed = assessments.filter(isFinalized).length;
    const aiScored = assessments.filter((item) => item.aiSuggestedScore != null);
    const hasCompleteAiTotal = result.aiSuggestedTotal != null;
    const partialAiScore = aiScored.length === 1 ? aiScored[0] : null;
    const duration = attemptDuration(attempt);
    const updateDraft = (change) => {
        setDrafts((current) => ({ ...current, [assessment.id]: { ...draft, ...change } }));
        setValidation('');
    };
    const finalize = () => {
        if (!canFinalize) return;
        const invalid = validateGradeDraft(draft, assessment);
        if (invalid) { setValidation(invalid); return; }
        const payload = gradePayload(draft, assessment);
        modal.confirm({
            title: `Chốt câu ${questions.indexOf(question) + 1}: ${displayScore(payload.finalScore)} / ${displayScore(assessment.points)} điểm?`,
            content: <div><p>Điểm chính thức do bạn quyết định. Sau khi chốt, câu này sẽ khóa chỉnh sửa.</p><p className="preserve-lines">Nhận xét: {payload.teacherComment || 'Không có'}</p></div>,
            okText: 'Chốt điểm câu này', cancelText: 'Xem lại',
            onOk: async () => {
                if (await review.finalize(assessment.id, payload)) {
                    setDrafts((current) => { const next = { ...current }; delete next[assessment.id]; return next; });
                    setValidation('');
                }
            },
        });
    };

    return <div className="workspace-page grading-page">
        {heading}
        {error && <Alert showIcon type="error" title={error} />}
        {notice && <Alert showIcon role="status" type={notice.type} title={notice.message} />}
        {stale && <Alert showIcon type="warning" title="Cần tải lại dữ liệu trước khi chấm tiếp." />}
        {data.warnings.map((warning) => <Alert key={warning} type="warning" showIcon title={warning} />)}
        <section className="review-summary">
            <div><span className="page-kicker">{course?.code ?? 'BÀI THI VẤN ĐÁP'}</span><h2>{student?.fullName || student?.username || attempt.userId}</h2>
                <p>{student?.username && <span>Tài khoản: {student.username} · </span>}{session.sessionTitle}</p>
                <p className="muted-text">Nộp lúc: {dateTime(attempt.submittedAt)}{duration != null && ` · Thời gian làm bài: ${formatElapsed(duration)}`}</p>
                <Tag color={result.status === 'Finalized' ? 'green' : 'blue'}>{GRADING_STATUSES[result.status] ?? result.status}</Tag></div>
            <div className="review-totals"><div><span>{hasCompleteAiTotal ? 'AI đề xuất' : partialAiScore ? `AI đề xuất · Câu ${questions.findIndex((item) => item.questionId === partialAiScore.questionId) + 1}/${questions.length}` : 'AI đề xuất'}</span><strong>{hasCompleteAiTotal ? <>{displayScore(result.aiSuggestedTotal)} <small>/ 10</small></> : partialAiScore ? <>{displayScore(partialAiScore.aiSuggestedScore)} <small>/ {displayScore(partialAiScore.points)}</small></> : <>{displayScore(null)} <small>/ 10</small></>}</strong></div>
                <div><span>Điểm chính thức</span><strong>{displayScore(result.totalScore)} <small>/ 10</small></strong></div>
                <div className="review-progress"><span>Đã chốt {completed}/{questions.length} câu</span><Progress percent={questions.length ? Math.round(100 * completed / questions.length) : 0} showInfo={false} /></div></div>
        </section>
        <Alert showIcon type={result.status === 'Finalized' ? 'success' : 'info'} title={result.status === 'Finalized'
            ? 'Bài thi đã chốt điểm chính thức.' : 'AI chỉ gợi ý. Giảng viên xem transcript và chốt từng câu trước khi công bố tổng điểm.'}
            description={result.status === 'InProgress' ? 'Bài đang làm; chưa thể chấm hoặc chốt điểm.' : result.status === 'Submitted' ? 'Bạn có thể chấm tay ngay. AI chỉ là gợi ý tùy chọn và nếu không phản hồi, việc chấm tay vẫn tiếp tục bình thường.' : undefined}
            action={(result.status === 'Submitted' || (result.status === 'AwaitingReview' && assessments.some((item) => item.aiSuggestedScore == null && item.finalScore == null && item.studentAnswer?.trim()))) && <Space wrap>{result.status === 'Submitted' && <Button type="primary" loading={busy === 'manual-review'} disabled={disabled || stale} onClick={review.prepareManualReview}>Chấm thủ công ngay</Button>}<Button icon={<RobotOutlined />} loading={busy === 'grading'} disabled={disabled || stale} onClick={review.grade}>{result.status === 'Submitted' ? 'Lấy gợi ý AI (tùy chọn)' : 'Chấm lại bằng AI'}</Button></Space>} />
        {busy === 'grading' && <Alert type="info" showIcon title="AI đang đối chiếu câu trả lời với rubric. Nếu AI không phản hồi, hệ thống vẫn mở bài cho bạn chấm tay." />}
        {result.status === 'Grading' && <Alert type="info" showIcon title="Bài đang được chấm AI. Bấm Tải lại để kiểm tra kết quả." />}
        <div className="review-workspace" aria-busy={disabled}>
            <section><Transcript questions={questions} turns={turns} startedAt={attempt.startedAt} /></section>
            <section className="review-evaluation">
                <Card title="Thẩm định từng câu" className="question-review-card">
                    <label htmlFor="grading-question" className="field-label">Chọn câu cần thẩm định</label>
                    <select id="grading-question" className="grading-select" value={question?.questionId ?? ''} disabled={disabled} onChange={(event) => { setSelectedId(event.target.value); setValidation(''); }}>
                        {questions.map((item, index) => <option key={item.questionId} value={item.questionId}>Câu {index + 1} · {displayScore(item.points)} điểm{isFinalized(assessments.find((entry) => entry.questionId === item.questionId)) ? ' · Đã chốt' : ''}</option>)}
                    </select>
                    {question ? <p className="review-question preserve-lines">{question.content}</p> : <Empty description="Bài thi chưa có câu hỏi." />}
                    {!assessment && <Alert type="info" showIcon title="Chưa có phiếu chấm cho câu này." description="Chọn “Chấm thủ công ngay” để nhập điểm, hoặc lấy gợi ý AI nếu cần." />}
                    {assessment && <>
                        <div className="question-ai-score"><span><RobotOutlined /> AI đề xuất</span><strong>{displayScore(assessment.aiSuggestedScore)} / {displayScore(assessment.points)}</strong>
                            <small>Độ tin cậy: {assessment.aiConfidenceLevel == null ? 'Chưa có dữ liệu' : `${displayScore(assessment.aiConfidenceLevel * 100)}%`}</small></div>
                        <h3>Nhận xét AI · Điểm mạnh, điểm yếu, ý còn thiếu</h3>
                        <p className="review-feedback preserve-lines">{assessment.aiFeedback || (assessment.studentAnswer?.trim() ? 'AI chưa cung cấp nhận xét.' : 'Không có câu trả lời; AI không đề xuất điểm. Giảng viên cần tự thẩm định.')}</p>
                        <details><summary>Câu trả lời đã được đưa vào chấm AI</summary><p className="preserve-lines">{assessment.studentAnswer || 'Không có câu trả lời.'}</p></details>
                        <div className="review-override">
                            <h3><AuditOutlined /> Quyết định của giảng viên {finalized && <Tag color="green">Đã chốt</Tag>}</h3>
                            {finalized ? <>
                                <strong className="official-question-score">{displayScore(assessment.finalScore)} / {displayScore(assessment.points)} điểm</strong>
                                <p className="preserve-lines">{assessment.teacherComment || 'Không có nhận xét giảng viên.'}</p>
                                <p className="muted-text">Chốt lúc: {dateTime(assessment.finalizedAt)} · Người chốt: {assessment.finalizedByUserId || '—'}</p>
                            </> : <>
                                <label className="field-label" htmlFor="override-score">Điểm chính thức (0 – {displayScore(assessment.points)})</label>
                                <input id="override-score" className="grading-score-input" type="number" min="0" max={assessment.points} step="0.01" value={draft.score} disabled={!canFinalize} onChange={(event) => updateDraft({ score: event.target.value })} aria-invalid={Boolean(validation)} />
                                <label className="field-label" htmlFor="faculty-notes">Nhận xét của giảng viên</label>
                                <Input.TextArea id="faculty-notes" rows={4} value={draft.comment} maxLength={2000} showCount disabled={!canFinalize} onChange={(event) => updateDraft({ comment: event.target.value })} placeholder="Nhận xét và giải thích điều chỉnh điểm..." />
                                {validation && <p className="grade-validation" role="alert">{validation}</p>}
                                {drafts[assessment.id] && hasGradeChanges(draft, assessment) && <p className="muted-text">Có thay đổi chưa chốt. Chuyển câu vẫn giữ nội dung trong phiên này.</p>}
                                <div className="review-grade-actions"><Button disabled={!canFinalize || assessment.aiSuggestedScore == null} onClick={() => updateDraft({ score: assessment.aiSuggestedScore })}>Dùng điểm AI</Button>
                                    <Button type="primary" icon={<CheckCircleOutlined />} disabled={!canFinalize} loading={busy === 'finalizing'} onClick={finalize}>Chốt điểm câu này</Button></div>
                            </>}
                        </div>
                    </>}
                </Card>
                <Rubric course={course} />
                <Card size="small" title="Tín hiệu phụ trợ"><p className="muted-text">{duration == null ? 'Chưa có thời lượng bài thi.' : `Thời gian làm bài: ${formatElapsed(duration)} (từ lúc bắt đầu đến lúc nộp).`} API chưa cung cấp độ trôi chảy, thời gian phản hồi từng câu hoặc bản ghi âm.</p></Card>
            </section>
        </div>
    </div>;
}
