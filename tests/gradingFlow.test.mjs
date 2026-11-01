import test from 'node:test';
import assert from 'node:assert/strict';
import { attemptDuration, describeGradingError, displayScore, gradePayload, hasGradeChanges, initialGradeDraft, isFinalized, parseAttemptId, validateGradeDraft } from '../src/utils/gradingFlow.js';

const id = 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb';
const assessment = { id: 'a1', points: 4, aiSuggestedScore: 2.75, finalScore: null, teacherComment: null, version: 7 };

test('open a grading UUID or link without treating an exam room link as an attempt', () => {
    assert.equal(parseAttemptId(` ${id.toUpperCase()} `), id);
    assert.equal(parseAttemptId(`/grading/${id}`), id);
    assert.equal(parseAttemptId(`https://aives.test/grading/review?attemptId=${id}`), id);
    assert.equal(parseAttemptId(`/exam-room/${id}`), null);
    assert.equal(parseAttemptId(`random ${id}`), null);
    assert.equal(parseAttemptId(''), null);
});

test('draft distinguishes a missing AI score, a zero AI score and a finalized zero', () => {
    assert.equal(initialGradeDraft({ ...assessment, aiSuggestedScore: null }).score, '');
    assert.equal(initialGradeDraft({ ...assessment, aiSuggestedScore: 0 }).score, 0);
    assert.equal(initialGradeDraft({ ...assessment, finalScore: 0 }).score, 0);
    assert.equal(isFinalized(assessment), false);
    assert.equal(isFinalized({ ...assessment, finalScore: 0 }), true);
    assert.equal(displayScore(null), '—');
    assert.equal(displayScore(0), '0');
});

test('final score uses the question points rather than a fixed ten point range', () => {
    for (const score of ['', null, 'abc', Infinity, -0.1, 4.01]) {
        assert.ok(validateGradeDraft({ score, comment: '' }, assessment), `Reject ${score}`);
    }
    for (const score of [0, '0', 2.75, '4']) assert.equal(validateGradeDraft({ score, comment: '' }, assessment), null);
    assert.ok(validateGradeDraft({ score: 1, comment: 'x'.repeat(2001) }, assessment));
    assert.equal(validateGradeDraft({ score: 1, comment: 'x'.repeat(2000) }, assessment), null);
});

test('human decision sends assessment version and trimmed comment, with no AI fields', () => {
    assert.deepEqual(gradePayload({ score: '0', comment: '  Chưa trả lời đủ ý.  ' }, assessment), {
        finalScore: 0, teacherComment: 'Chưa trả lời đủ ý.', version: 7,
    });
    assert.equal(gradePayload({ score: '4', comment: '  ' }, assessment).teacherComment, null);
    assert.equal(hasGradeChanges(initialGradeDraft(assessment), assessment), false);
    assert.equal(hasGradeChanges({ score: 3, comment: '' }, assessment), true);
    assert.equal(hasGradeChanges({ score: 2.75, comment: 'Nhận xét' }, assessment), true);
    assert.equal(hasGradeChanges({ score: 1, comment: '' }, { ...assessment, finalScore: 0 }), false);
});

test('duration is elapsed submission time without manufacturing fluency signals', () => {
    assert.equal(attemptDuration({ startedAt: '2026-11-01T01:00:00Z', submittedAt: '2026-11-01T01:01:05Z' }), 65);
    assert.equal(attemptDuration({ startedAt: 'bad', submittedAt: 'bad' }), null);
    assert.equal(attemptDuration({ startedAt: '2026-11-01T01:00:00Z' }), null);
});

test('conflict, ownership and AI errors provide actionable messages', () => {
    const failure = (status, data = {}) => ({ response: { status, data } });
    assert.match(describeGradingError(failure(409)), /Tải lại/);
    assert.match(describeGradingError(failure(403)), /không có quyền/);
    assert.match(describeGradingError(failure(503)), /AI/);
    assert.match(describeGradingError({}), /kết nối/);
    assert.equal(describeGradingError(failure(400, { errors: { FinalScore: ['Điểm không hợp lệ.'] } })), 'Điểm không hợp lệ.');
});
