import axiosClient from './axiosClient';

export const questionApi = {
    getQuestions: () => axiosClient.get('/questions'),
    importQuestions: (data) => axiosClient.post('/questions/import', data),
};
