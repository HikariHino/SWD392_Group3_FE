import axiosClient from './axiosClient';

// Endpoint Backend: WebApi/Controllers/QuestionsController.cs
export const questionApi = {
    // GET /api/questions?searchTerm=&courseId=&bloomLevel=&pageIndex=&pageSize=
    getQuestions: (params, config = {}) => axiosClient.get('/questions', { ...config, params }),
    // GET /api/questions/{id}
    getQuestionById: (id) => axiosClient.get(`/questions/${id}`),
    // POST /api/questions  { courseId, content, bloomLevel }
    createQuestion: (data) => axiosClient.post('/questions', data),
    // PUT /api/questions/{id}  { content, bloomLevel }
    updateQuestion: (id, data) => axiosClient.put(`/questions/${id}`, data),
    // DELETE /api/questions/{id}
    deleteQuestion: (id) => axiosClient.delete(`/questions/${id}`),
    // GET /api/courses - includes course-level rubrics used by the question bank.
    getCourses: (config = {}) => axiosClient.get('/courses', config),
    // PUT /api/courses/{courseId}/rubrics
    replaceCourseRubrics: (courseId, rubrics) => axiosClient.put(`/courses/${courseId}/rubrics`, { rubrics }),
    // Returns a draft; POST /questions persists it after the lecturer reviews it.
    generateQuestionWithAi: (data, config = {}) =>
        axiosClient.post('/questions/ai-generate', data, { timeout: 120000, ...config }),
    importQuestions: ({ courseId, file }) => {
        const form = new FormData();
        form.append('courseId', courseId);
        form.append('file', file);
        return axiosClient.post('/questions/import', form);
    },
};
