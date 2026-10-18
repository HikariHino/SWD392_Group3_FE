import axiosClient from './axiosClient';

// Endpoint Backend: WebApi/Controllers/QuestionsController.cs
export const questionApi = {
    // GET /api/questions?searchTerm=&courseId=&bloomLevel=&pageIndex=&pageSize=
    getQuestions: (params, config = {}) => axiosClient.get('/questions', { ...config, params }),
    // GET /api/questions/{id}
    getQuestionById: (id) => axiosClient.get(`/questions/${id}`),
    // POST /api/questions  { courseId, content, bloomLevel, rubrics: [{ criteria, weight, maxScore }] }
    createQuestion: (data) => axiosClient.post('/questions', data),
    // PUT /api/questions/{id}  { content, bloomLevel, rubrics: [...] }
    updateQuestion: (id, data) => axiosClient.put(`/questions/${id}`, data),
    // DELETE /api/questions/{id}
    deleteQuestion: (id) => axiosClient.delete(`/questions/${id}`),
    // GET /api/questions/courses
    getCourses: (config = {}) => axiosClient.get('/questions/courses', config),
    importQuestions: (data) => axiosClient.post('/questions/import', data),
};
