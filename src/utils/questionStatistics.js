import { BLOOM_LEVELS } from './bloomLevel.js';

export function summarizeQuestions(questions, courses, courseId) {
    const selected = courseId ? questions.filter((q) => q.courseId === courseId) : questions;
    const rubricCount = selected.reduce((sum, q) => sum + (q.rubrics?.length ?? 0), 0);
    const withRubrics = selected.filter((q) => q.rubrics?.length > 0).length;
    return {
        selected, total: selected.length, rubricCount, withRubrics,
        coverage: selected.length ? Math.round(withRubrics / selected.length * 100) : 0,
        blooms: BLOOM_LEVELS.map((bloom) => ({ ...bloom, count: selected.filter((q) => q.bloomLevel === bloom.value).length })),
        courses: courses.filter((course) => !courseId || course.id === courseId).map((course) => {
            const rows = selected.filter((q) => q.courseId === course.id);
            return { ...course, questionCount: rows.length, rubricCount: rows.reduce((sum, q) => sum + (q.rubrics?.length ?? 0), 0) };
        }),
    };
}
