import test from 'node:test';
import assert from 'node:assert/strict';
import {
    answersOf,
    countAnswered,
    describeExamError,
    followUpsOf,
    followUpToTurn,
    formatElapsed,
    hubUrlFrom,
    mergeTurns,
    newClientMessageId,
    parseSessionId,
    resumeIndex,
} from '../src/utils/examFlow.js';

const SESSION_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const turn = (id, sequence, speaker, questionId) => ({ id, sequence, speaker, questionId, contentText: id });
const httpError = (status, detail) => ({ response: { status, data: { detail } } });

test('session id is read from a raw code or a shared link', () => {
    assert.equal(parseSessionId(SESSION_ID.toUpperCase()), SESSION_ID);
    assert.equal(parseSessionId(`  http://localhost:5173/exam-room/${SESSION_ID}?x=1 `), SESSION_ID);
    for (const value of ['', '   ', 'abc', undefined, null]) assert.equal(parseSessionId(value), null);
});

test('hub url is derived from the REST base url', () => {
    assert.equal(hubUrlFrom('http://localhost:5110/api'), 'http://localhost:5110/interviewHub');
    assert.equal(hubUrlFrom('https://host.example/api/'), 'https://host.example/interviewHub');
    assert.equal(hubUrlFrom('https://host.example'), 'https://host.example/interviewHub');
});

test('client message ids are valid UUIDs, with or without crypto.randomUUID', (t) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    assert.match(newClientMessageId(), uuid);
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
    t.after(() => delete globalThis.crypto.randomUUID);
    for (let i = 0; i < 50; i += 1) assert.match(newClientMessageId(), uuid);
});

test('merging keeps one copy of a turn that arrives from both SignalR and REST', () => {
    const first = turn('a', 1, 'Student', 'q1');
    const followUp = followUpToTurn({ id: 'b', sequence: 2, contentText: 'why?', questionId: 'q1' });
    const merged = mergeTurns(mergeTurns([first], followUp), [{ ...followUp }, turn('c', 3, 'Student', 'q1')]);
    assert.deepEqual(merged.map((item) => item.id), ['a', 'b', 'c']);
    assert.equal(merged[1].speaker, 'AI');
});

test('merging orders turns by sequence when a late turn arrives', () => {
    const merged = mergeTurns([turn('c', 3, 'Student', 'q1')], [turn('a', 1, 'Student', 'q1'), turn('b', 2, 'AI', 'q1')]);
    assert.deepEqual(merged.map((item) => item.sequence), [1, 2, 3]);
});

test('answers and follow-ups are counted per question', () => {
    const questions = [{ questionId: 'q1' }, { questionId: 'q2' }, { questionId: 'q3' }];
    const turns = [turn('a', 1, 'Student', 'q1'), turn('b', 2, 'AI', 'q1'), turn('c', 3, 'Student', 'q2')];
    assert.equal(answersOf(turns, 'q1').length, 1);
    assert.equal(followUpsOf(turns, 'q1').length, 1);
    assert.equal(followUpsOf(turns, 'q2').length, 0);
    assert.equal(countAnswered(questions, turns), 2);
});

test('resume returns to the question of the latest turn, or the first question', () => {
    const questions = [{ questionId: 'q1' }, { questionId: 'q2' }];
    assert.equal(resumeIndex(questions, []), 0);
    assert.equal(resumeIndex(questions, [turn('a', 1, 'Student', 'q1'), turn('b', 2, 'AI', 'q2')]), 1);
    assert.equal(resumeIndex(questions, [turn('a', 1, 'Student', 'unknown')]), 0);
});

test('elapsed time is formatted with and without hours', () => {
    assert.equal(formatElapsed(0), '00:00');
    assert.equal(formatElapsed(65), '01:05');
    assert.equal(formatElapsed(3725), '1:02:05');
});

test('backend errors become messages a student can act on', () => {
    assert.match(describeExamError({}), /kết nối/);
    assert.match(describeExamError(httpError(409, 'Session is not open within its exam window.')), /hết giờ/);
    assert.match(describeExamError(httpError(409, 'Session was cancelled.')), /huỷ/);
    assert.match(describeExamError(httpError(409, 'Attempt no longer accepts answers.')), /kết thúc/);
    assert.match(describeExamError(httpError(409, 'Session or attempt changed. Retry the request.')), /thử lại/);
    assert.match(describeExamError(httpError(404)), /mã hoặc link/);
    assert.match(describeExamError(httpError(503)), /AI/);
    assert.equal(describeExamError(httpError(500), 'Không vào được phòng thi.'), 'Không vào được phòng thi.');
});
