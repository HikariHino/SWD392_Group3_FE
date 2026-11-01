import axiosClient from './axiosClient';

// Endpoint Backend: WebApi/Controllers/AttemptsController.cs + ExamSessionsController.cs
export const examApi = {
    // POST /api/exam-sessions/{id}/attempts -> AttemptDto (vào lại ca thi thì trả về lượt cũ)
    startAttempt: (sessionId) => axiosClient.post(`/exam-sessions/${sessionId}/attempts`),
    getAttempt: (attemptId, config) => axiosClient.get(`/attempts/${attemptId}`, config),
    getQuestions: (attemptId, config) => axiosClient.get(`/attempts/${attemptId}/questions`, config),
    getTurns: (attemptId, config) => axiosClient.get(`/attempts/${attemptId}/turns`, config),
    // POST /api/attempts/{id}/answers { questionId, answerText, clientMessageId }
    // Gửi lại cùng clientMessageId không tạo lượt mới, nên an toàn khi thử lại sau lỗi mạng
    sendAnswer: (attemptId, data) => axiosClient.post(`/attempts/${attemptId}/answers`, data),
    // Dùng khi kênh SignalR không sẵn sàng
    requestFollowUp: (attemptId) => axiosClient.post(`/attempts/${attemptId}/follow-up`),
    submitAttempt: (attemptId) => axiosClient.post(`/attempts/${attemptId}/submit`),

    // POST /api/exam-sessions { courseId, sessionTitle, startTime, endTime, questionIds } (thời gian UTC)
    createSession: (data) => axiosClient.post('/exam-sessions', data),
    listSessions: () => axiosClient.get('/exam-sessions'),
    getSession: (sessionId, config) => axiosClient.get(`/exam-sessions/${sessionId}`, config),
    getSessionAttempts: (sessionId, config) => axiosClient.get(`/exam-sessions/${sessionId}/attempts`, config),
    // action: open | close | cancel
    transitionSession: (sessionId, action) => axiosClient.post(`/exam-sessions/${sessionId}/${action}`),
};
