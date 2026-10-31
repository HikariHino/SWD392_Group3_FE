import { useCallback, useEffect, useRef, useState } from 'react';
import { examApi } from '../services/examApi';
import {
    ATTEMPT_IN_PROGRESS,
    describeExamError,
    followUpsOf,
    followUpToTurn,
    isConflict,
    MAX_FOLLOW_UPS,
    mergeTurns,
    newClientMessageId,
    resumeIndex,
} from '../utils/examFlow';
import { useSignalR } from './useSignalR';

/**
 * Điều phối một lượt thi: vào ca, gửi câu trả lời, nhận câu hỏi xoáy và nộp bài.
 * phase: loading | error | active | finished
 * step:  idle | sending | waiting-ai | submitting
 *
 * Câu trả lời luôn lưu qua REST. SignalR chỉ dùng để lấy câu hỏi xoáy, nên mất kết nối
 * hoặc AI lỗi đều không chặn sinh viên làm tiếp.
 */
export default function useExamAttempt(sessionId) {
    const [phase, setPhase] = useState('loading');
    const [loadError, setLoadError] = useState('');
    const [attempt, setAttempt] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [turns, setTurns] = useState([]);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [draft, setDraft] = useState('');
    const [pendingText, setPendingText] = useState('');
    const [step, setStep] = useState('idle');
    const [notice, setNotice] = useState(null); // { action: 'send' | 'follow-up' | 'submit', message }
    const [windowClosed, setWindowClosed] = useState(false);

    const loadPromise = useRef(null);
    const busy = useRef(false);
    const pendingAnswer = useRef(null);
    const turnsRef = useRef([]);

    const attemptId = attempt?.id;
    const question = questions[questionIndex];

    const applyTurns = useCallback((incoming) => {
        turnsRef.current = mergeTurns(turnsRef.current, incoming);
        setTurns(turnsRef.current);
        return turnsRef.current;
    }, []);

    const reloadTurns = useCallback(async (id) => {
        const { data } = await examApi.getTurns(id);
        return applyTurns(data);
    }, [applyTurns]);

    const load = useCallback(() => {
        // StrictMode chạy effect 2 lần, còn POST song song có thể trả 409 nên chỉ giữ một request
        if (loadPromise.current) return loadPromise.current;
        setPhase('loading');
        setLoadError('');
        loadPromise.current = (async () => {
            try {
                const { data: started } = await examApi.startAttempt(sessionId);
                const [{ data: questionList }, { data: turnList }] = await Promise.all([
                    examApi.getQuestions(started.id),
                    examApi.getTurns(started.id),
                ]);
                turnsRef.current = [];
                const loadedTurns = applyTurns(turnList);
                setAttempt(started);
                setQuestions(questionList);
                setQuestionIndex(resumeIndex(questionList, loadedTurns));
                setPhase(started.status === ATTEMPT_IN_PROGRESS ? 'active' : 'finished');
            } catch (error) {
                setLoadError(describeExamError(error, 'Không vào được phòng thi. Vui lòng thử lại.'));
                setPhase('error');
            } finally {
                loadPromise.current = null;
            }
        })();
        return loadPromise.current;
    }, [sessionId, applyTurns]);

    useEffect(() => {
        load();
    }, [load]);

    const hub = useSignalR({
        enabled: phase === 'active',
        onFollowUp: (followUp) => applyTurns(followUpToTurn(followUp)),
        // Trong lúc mất kết nối có thể đã bỏ lỡ sự kiện từ server
        onReconnected: () => attemptId && reloadTurns(attemptId).catch(() => {}),
    });
    const { requestFollowUp: invokeFollowUp } = hub;

    // 409: bài có thể vừa bị đóng khi hết ca, hoặc đã hết giờ nhưng sinh viên chưa nộp
    const resolveConflict = useCallback(async (id) => {
        try {
            const { data } = await examApi.getAttempt(id);
            setAttempt(data);
            if (data.status === ATTEMPT_IN_PROGRESS) setWindowClosed(true);
            else setPhase('finished');
        } catch {
            setWindowClosed(true);
        }
    }, []);

    const askFollowUp = useCallback(async (id) => {
        setStep('waiting-ai');
        setNotice(null);
        try {
            try {
                await invokeFollowUp(id);
                // Sự kiện ReceiveAIFollowUp luôn đến trước khi invoke hoàn tất
                if (turnsRef.current.at(-1)?.speaker !== 'AI') await reloadTurns(id);
                return;
            } catch {
                // Hub không trả mã lỗi rõ ràng. AI có thể đã lưu lượt hỏi trước khi rớt mạng,
                // nên kiểm tra lại rồi mới gọi REST để tránh sinh trùng câu hỏi xoáy.
                const latest = await reloadTurns(id);
                if (latest.at(-1)?.speaker === 'AI') return;
            }
            const { data } = await examApi.requestFollowUp(id);
            applyTurns(followUpToTurn(data));
        } catch (error) {
            if (isConflict(error)) await resolveConflict(id);
            setNotice({ action: 'follow-up', message: describeExamError(error, 'Chưa lấy được câu hỏi xoáy.') });
        } finally {
            setStep('idle');
        }
    }, [invokeFollowUp, reloadTurns, applyTurns, resolveConflict]);

    const sendAnswer = useCallback(async (spokenText = '') => {
        const text = [draft.trim(), spokenText.trim()].filter(Boolean).join(' ');
        if (!text || !question || !attemptId || busy.current) return;
        const { questionId } = question;

        // Gửi lại đúng nội dung thì giữ clientMessageId: lần trước có thể đã lưu dù bị mất phản hồi
        if (pendingAnswer.current?.text !== text || pendingAnswer.current?.questionId !== questionId) {
            pendingAnswer.current = { text, questionId, clientMessageId: newClientMessageId() };
        }

        busy.current = true;
        setDraft(text);
        setPendingText(text);
        setNotice(null);
        setStep('sending');
        try {
            const { data } = await examApi.sendAnswer(attemptId, {
                questionId,
                answerText: text,
                clientMessageId: pendingAnswer.current.clientMessageId,
            });
            pendingAnswer.current = null;
            const merged = applyTurns(data);
            setDraft('');
            setPendingText('');
            if (followUpsOf(merged, questionId).length < MAX_FOLLOW_UPS) await askFollowUp(attemptId);
            else setStep('idle');
        } catch (error) {
            if (isConflict(error)) await resolveConflict(attemptId);
            setPendingText('');
            setStep('idle');
            setNotice({ action: 'send', message: describeExamError(error, 'Chưa gửi được câu trả lời.') });
        } finally {
            busy.current = false;
        }
    }, [draft, question, attemptId, applyTurns, askFollowUp, resolveConflict]);

    const retryFollowUp = useCallback(async () => {
        if (!attemptId || busy.current) return;
        busy.current = true;
        await askFollowUp(attemptId);
        busy.current = false;
    }, [attemptId, askFollowUp]);

    const nextQuestion = useCallback(() => {
        if (busy.current) return;
        setQuestionIndex((index) => Math.min(index + 1, questions.length - 1));
        setDraft('');
        setNotice(null);
        pendingAnswer.current = null;
    }, [questions.length]);

    const submit = useCallback(async () => {
        if (!attemptId || busy.current) return;
        busy.current = true;
        setNotice(null);
        setStep('submitting');
        try {
            const { data } = await examApi.submitAttempt(attemptId);
            setAttempt(data);
            setPhase('finished');
        } catch (error) {
            if (isConflict(error)) await resolveConflict(attemptId);
            setNotice({ action: 'submit', message: describeExamError(error, 'Chưa nộp được bài.') });
        } finally {
            busy.current = false;
            setStep('idle');
        }
    }, [attemptId, resolveConflict]);

    const appendDraft = useCallback((text) => {
        setDraft((current) => (current.trim() ? `${current.trimEnd()} ${text}` : text));
    }, []);

    return {
        phase, loadError, attempt, questions, question, questionIndex, turns, draft, pendingText, step, notice, windowClosed,
        connection: hub,
        setDraft, appendDraft, reload: load, sendAnswer, retryFollowUp, nextQuestion, submit,
    };
}
