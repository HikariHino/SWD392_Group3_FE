import axiosClient from './axiosClient';

export const gradingApi = {
    getAssessments: (attemptId, config) => axiosClient.get(`/attempts/${attemptId}/assessments`, config),
    getResult: (attemptId, config) => axiosClient.get(`/attempts/${attemptId}/result`, config),
    gradeAttempt: (attemptId) => axiosClient.post(`/attempts/${attemptId}/grade`, null, { timeout: 180000 }),
    prepareManualReview: (attemptId) => axiosClient.post(`/attempts/${attemptId}/grade/manual-review`),
    finalizeAssessment: (assessmentId, data) => axiosClient.put(`/assessments/${assessmentId}/final-score`, data),
    getCourse: (courseId, config) => axiosClient.get(`/courses/${courseId}`, config),
    getStudent: (userId, config) => axiosClient.get(`/users/${userId}`, config),
};
