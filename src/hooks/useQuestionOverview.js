import { useCallback, useEffect, useRef, useState } from 'react';
import { questionApi } from '../services/questionApi';
import { parseApiError } from '../utils/apiError';

export default function useQuestionOverview() {
    const [state, setState] = useState({ questions: [], courses: [], loading: true, error: '', updatedAt: null });
    const active = useRef(null);
    const reload = useCallback(async () => {
        active.current?.abort();
        const controller = new AbortController();
        active.current = controller;
        const config = { signal: controller.signal };
        setState((previous) => ({ ...previous, loading: true, error: '' }));
        try {
            const [courseResponse, firstResponse] = await Promise.all([
                questionApi.getCourses(config), questionApi.getQuestions({ pageIndex: 1, pageSize: 100 }, config),
            ]);
            const first = firstResponse.data;
            const questions = [...first.items];
            const pages = Math.ceil(first.totalCount / 100);
            for (let pageIndex = 2; pageIndex <= pages; pageIndex++) {
                const { data } = await questionApi.getQuestions({ pageIndex, pageSize: 100 }, config);
                if (data.totalCount !== first.totalCount) throw new Error('Danh sách câu hỏi vừa thay đổi. Vui lòng tải lại thống kê.');
                questions.push(...data.items);
            }
            if (new Set(questions.map((q) => q.id)).size !== first.totalCount) throw new Error('Dữ liệu phân trang vừa thay đổi. Vui lòng tải lại.');
            if (!controller.signal.aborted) setState({ questions, courses: courseResponse.data, loading: false, error: '', updatedAt: new Date() });
        } catch (error) {
            if (!controller.signal.aborted) setState((previous) => ({ ...previous, loading: false, error: error.response || error.request ? parseApiError(error).message : error.message }));
        }
    }, []);
    useEffect(() => {
        const timer = window.setTimeout(reload, 0);
        return () => { window.clearTimeout(timer); active.current?.abort(); };
    }, [reload]);
    return { ...state, reload };
}
