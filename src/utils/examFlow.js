// Logic thuần của phòng thi (Flow 3): không phụ thuộc React/axios để test được bằng node:test.

export const ATTEMPT_IN_PROGRESS = 'InProgress';
export const MAX_ANSWER_LENGTH = 20000;
// Backend chưa giới hạn số lượt hỏi xoáy, FE tự dừng ở 2 lượt mỗi câu theo thiết kế phòng thi
export const MAX_FOLLOW_UPS = 2;

const GUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Sinh viên có thể dán mã ca thi hoặc nguyên link giảng viên gửi
export const parseSessionId = (value) => String(value ?? '').match(GUID_PATTERN)?.[0].toLowerCase() ?? null;

// "http://localhost:5110/api" -> "http://localhost:5110/interviewHub"
export const hubUrlFrom = (apiBaseUrl) =>
    `${apiBaseUrl.replace(/\/+$/, '').replace(/\/api$/i, '')}/interviewHub`;

export const newClientMessageId = () => {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
    // randomUUID chỉ có trên HTTPS/localhost; khi demo qua IP LAN thì tự sinh UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = Math.floor(Math.random() * 16);
        return (char === 'x' ? random : (random % 4) + 8).toString(16);
    });
};

// FollowUpTurnDto không có speaker -> chuẩn hoá về cùng dạng TurnDto
export const followUpToTurn = (followUp) => ({ ...followUp, speaker: 'AI', clientMessageId: null });

// Một lượt có thể về từ cả SignalR lẫn REST nên phải gộp theo id rồi xếp lại theo sequence
export const mergeTurns = (current, incoming) => {
    const byId = new Map(current.map((turn) => [turn.id, turn]));
    [].concat(incoming).forEach((turn) => byId.set(turn.id, turn));
    return [...byId.values()].sort((a, b) => a.sequence - b.sequence);
};

export const answersOf = (turns, questionId) =>
    turns.filter((turn) => turn.speaker === 'Student' && turn.questionId === questionId);

export const followUpsOf = (turns, questionId) =>
    turns.filter((turn) => turn.speaker === 'AI' && turn.questionId === questionId);

export const countAnswered = (questions, turns) =>
    questions.filter((question) => answersOf(turns, question.questionId).length > 0).length;

// Vào lại phòng thi: quay về câu của lượt gần nhất để còn trả lời câu hỏi xoáy đang dở
export const resumeIndex = (questions, turns) =>
    Math.max(questions.findIndex((question) => question.questionId === turns.at(-1)?.questionId), 0);

export const isConflict = (error) => error?.response?.status === 409;

export const formatElapsed = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
};

const CONFLICT_MESSAGES = [
    ['exam window', 'Ca thi chưa mở hoặc đã hết giờ nhận câu trả lời.'],
    ['not open', 'Ca thi hiện không mở.'],
    ['cancelled', 'Ca thi đã bị huỷ.'],
    ['no longer accepts', 'Bài thi đã kết thúc nên không nhận thêm câu trả lời.'],
    ['does not currently accept', 'Bài thi hiện không nhận thêm câu hỏi xoáy.'],
    ['archived', 'Lượt thi này đã được lưu trữ, không thể thi lại.'],
    ['incomplete', 'Ca thi chưa có đủ dữ liệu câu hỏi. Hãy báo giảng viên.'],
];

const STATUS_MESSAGES = {
    401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    403: 'Tài khoản này không có quyền thực hiện thao tác trong ca thi.',
    404: 'Không tìm thấy ca thi. Hãy kiểm tra lại mã hoặc link giảng viên gửi.',
    502: 'AI trả về nội dung không hợp lệ.',
    503: 'AI đang chưa sẵn sàng.',
    504: 'AI phản hồi quá lâu.',
};

// Backend trả lời lỗi bằng tiếng Anh trong ProblemDetails.detail -> đổi sang câu sinh viên đọc được
export const describeExamError = (error, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại.') => {
    if (!error?.response) return 'Không kết nối được tới máy chủ. Hãy kiểm tra mạng rồi thử lại.';
    const { status, data } = error.response;
    if (status === 409) {
        const detail = String(data?.detail ?? '').toLowerCase();
        return CONFLICT_MESSAGES.find(([keyword]) => detail.includes(keyword))?.[1]
            ?? 'Dữ liệu ca thi vừa thay đổi. Vui lòng thử lại.';
    }
    return STATUS_MESSAGES[status] ?? fallback;
};
