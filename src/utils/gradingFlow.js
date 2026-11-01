export const GRADING_STATUSES = {
    InProgress: 'Đang làm bài',
    Submitted: 'Đã nộp · Chờ AI chấm',
    Grading: 'Đang chấm AI',
    AwaitingReview: 'Chờ giảng viên thẩm định',
    Finalized: 'Đã chốt điểm',
};

// Accept an attempt UUID or a grading link, never silently extract a session UUID.
export const parseAttemptId = (value) => {
    const text = String(value ?? '').trim();
    const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
    if (new RegExp(`^${uuid}$`, 'i').test(text)) return text.toLowerCase();
    try {
        const url = new URL(text, 'http://local');
        if (!/^\/grading(?:\/|$)/.test(url.pathname)) return null;
        const id = url.searchParams.get('attemptId') ?? url.pathname.split('/')[2];
        return new RegExp(`^${uuid}$`, 'i').test(id ?? '') ? id.toLowerCase() : null;
    } catch {
        return null;
    }
};

export const isFinalized = (assessment) => assessment?.finalScore != null || assessment?.finalizedAt != null;
export const initialGradeDraft = (assessment) => ({
    score: assessment.finalScore ?? assessment.aiSuggestedScore ?? '',
    comment: assessment.teacherComment ?? '',
});
export const validateGradeDraft = (draft, assessment) => {
    if (draft.score === '' || draft.score == null || !Number.isFinite(Number(draft.score))) return 'Vui lòng nhập điểm hợp lệ.';
    if (Number(draft.score) < 0 || Number(draft.score) > assessment.points) return `Điểm phải từ 0 đến ${assessment.points}.`;
    if (draft.comment.trim().length > 2000) return 'Nhận xét tối đa 2.000 ký tự.';
    return null;
};
export const gradePayload = (draft, assessment) => ({
    finalScore: Number(draft.score),
    teacherComment: draft.comment.trim() || null,
    version: assessment.version,
});
export const hasGradeChanges = (draft, assessment) => {
    const initial = initialGradeDraft(assessment);
    return !isFinalized(assessment) && (String(draft.score) !== String(initial.score) || draft.comment !== initial.comment);
};
export const displayScore = (score) => score == null ? '—' : Number(score).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
// These timestamps describe elapsed exam time; they do not measure speech fluency.
export const attemptDuration = (attempt) => {
    if (!attempt?.startedAt || !attempt?.submittedAt) return null;
    const seconds = (Date.parse(attempt.submittedAt) - Date.parse(attempt.startedAt)) / 1000;
    return Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : null;
};
export const describeGradingError = (error, fallback = 'Không tải được dữ liệu chấm điểm.') => {
    if (!error?.response) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
    const { status, data } = error.response;
    const messages = {
        401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        403: 'Bạn không có quyền chấm bài của ca thi này.',
        404: 'Không tìm thấy dữ liệu. Kiểm tra mã lượt thi và thử lại.',
        409: 'Dữ liệu hoặc trạng thái bài thi đã thay đổi. Tải lại trước khi tiếp tục chấm.',
        502: 'AI trả về kết quả không hợp lệ. Hãy thử chấm lại.',
        503: 'Dịch vụ AI chưa sẵn sàng. Hãy thử lại sau.',
        504: 'AI phản hồi quá lâu. Hãy thử chấm lại.',
    };
    if (status === 400 && data?.errors) return Object.values(data.errors).flat().join(' ');
    return messages[status] ?? data?.detail ?? data?.message ?? fallback;
};
