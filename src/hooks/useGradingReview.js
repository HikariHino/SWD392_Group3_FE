import { useCallback, useEffect, useRef, useState } from 'react';
import { examApi } from '../services/examApi';
import { gradingApi } from '../services/gradingApi';
import { describeGradingError } from '../utils/gradingFlow';

async function fetchReview(attemptId, signal) {
    const config = { signal };
    const [attemptResponse, questionsResponse, turnsResponse, resultResponse] = await Promise.all([
        examApi.getAttempt(attemptId, config), examApi.getQuestions(attemptId, config),
        examApi.getTurns(attemptId, config), gradingApi.getResult(attemptId, config),
    ]);
    const attempt = attemptResponse.data;
    const { data: session } = await examApi.getSession(attempt.sessionId, config);
    // Missing profile/rubric must not hide the submitted transcript or block review.
    const [course, student] = await Promise.allSettled([
        gradingApi.getCourse(session.courseId, config), gradingApi.getStudent(attempt.userId, config),
    ]);
    return {
        attempt, session,
        questions: [...questionsResponse.data].sort((a, b) => a.displayOrder - b.displayOrder),
        turns: [...turnsResponse.data].sort((a, b) => a.sequence - b.sequence),
        result: resultResponse.data,
        course: course.status === 'fulfilled' ? course.value.data : null,
        student: student.status === 'fulfilled' ? student.value.data : null,
        warnings: [
            course.status === 'rejected' && `Không tải được rubric môn học. ${describeGradingError(course.reason)}`,
            student.status === 'rejected' && 'Không tải được hồ sơ sinh viên; đang hiển thị mã người dùng.',
        ].filter(Boolean),
    };
}

export default function useGradingReview(attemptId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState(null);
    const [stale, setStale] = useState(false);
    const mounted = useRef(false);
    const lock = useRef(false);
    const controller = useRef(null);

    const reload = useCallback(async () => {
        if (lock.current && !controller.current?.signal.aborted) return false;
        lock.current = true;
        const requestController = new AbortController();
        controller.current = requestController;
        setLoading(true);
        setError('');
        try {
            const review = await fetchReview(attemptId, requestController.signal);
            if (!mounted.current || requestController.signal.aborted) return false;
            setData(review);
            setStale(false);
            setNotice(null);
            return true;
        } catch (failure) {
            if (mounted.current && !requestController.signal.aborted) {
                setError(describeGradingError(failure));
                setStale(true);
            }
            return false;
        } finally {
            if (controller.current === requestController) {
                lock.current = false;
                if (mounted.current) setLoading(false);
            }
        }
    }, [attemptId]);

    useEffect(() => {
        mounted.current = true;
        let disposed = false;
        // Schedule the initial fetch after mount; StrictMode may dispose its first effect.
        queueMicrotask(() => { if (!disposed) reload(); });
        return () => {
            disposed = true;
            mounted.current = false;
            controller.current?.abort();
        };
    }, [reload]);

    const run = async (action, request, successText) => {
        if (lock.current || stale) return false;
        lock.current = true;
        setBusy(action);
        setNotice(null);
        let committed = false;
        try {
            const response = await request();
            committed = true;
            if (!mounted.current) return false;
            if (action === 'finalizing') {
                // Lock the saved question immediately even if the subsequent GET fails.
                setData((current) => ({ ...current, result: { ...current.result,
                    assessments: current.result.assessments.map((item) => item.id === response.data.id ? response.data : item),
                } }));
            }
            const review = await fetchReview(attemptId);
            if (!mounted.current) return false;
            setData(review);
            setNotice({ type: 'success', message: successText });
            return true;
        } catch (failure) {
            if (!mounted.current) return false;
            const conflict = failure.response?.status === 409;
            // A lost write response can still mean the server saved it. Reconcile with GET.
            const uncertain = !failure.response || failure.response.status >= 500;
            if (committed || conflict || uncertain) setStale(true);
            setNotice({ type: committed ? 'warning' : 'error', message: committed
                ? `${successText} Chưa tải lại được kết quả; bấm Tải lại để đồng bộ.`
                : `${describeGradingError(failure, 'Không lưu được điểm.')} ${uncertain ? 'Tải lại để kiểm tra trạng thái trước khi thử tiếp.' : ''}` });
            return false;
        } finally {
            lock.current = false;
            if (mounted.current) setBusy('');
        }
    };

    return { data, loading, busy, error, notice, stale, reload,
        grade: () => run('grading', () => gradingApi.gradeAttempt(attemptId), 'Đã có điểm AI đề xuất. Giảng viên cần thẩm định từng câu.'),
        finalize: (assessmentId, payload) => run('finalizing', () => gradingApi.finalizeAssessment(assessmentId, payload), 'Đã lưu điểm chính thức của câu hỏi.'),
    };
}
