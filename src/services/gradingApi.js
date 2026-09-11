import axiosClient from './axiosClient';

export const gradingApi = {
    getStudentScore: (studentId) => axiosClient.get(`/grading/${studentId}`),
};
