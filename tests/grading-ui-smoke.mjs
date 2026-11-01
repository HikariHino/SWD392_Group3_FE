// Integration smoke test with HTTP fixtures matching E:\SWDBE DTOs; never writes to the real API.
// Start: npm run preview -- --configLoader runner --outDir .build-flow4.local --port 4174
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4174';
const output = path.resolve('.ui-smoke.local', `grading-${Date.now()}`);
await mkdir(output, { recursive: true });
const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${output}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pending = new Map();
let socket, nextId = 0;
const runtimeErrors = [], apiErrors = [], writes = [];
const id = 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb';
const questions = [
    { questionId: 'q1', displayOrder: 1, points: 4, content: 'Giải thích tính đóng gói và ví dụ trong Java.' },
    { questionId: 'q2', displayOrder: 2, points: 6, content: 'So sánh kế thừa và đa hình.' },
];
const user = { id: 'lecturer', username: 'lecturer', fullName: 'Giảng viên kiểm thử', role: 'Lecturer' };
const attempt = { id, sessionId: 's1', userId: 'student1', status: 'Submitted', startedAt: '2026-11-01T01:00:00Z', submittedAt: '2026-11-01T01:14:20Z', version: 2 };
let assessments = [], failGrade = false, failSave = 0, failLoad = 0, failCourse = false, failResultOnce = false, resultGetCount = 0;
const result = () => ({ attemptId: id, status: attempt.status,
    aiSuggestedTotal: assessments.length === questions.length && assessments.every((item) => item.aiSuggestedScore != null)
        ? 10 * assessments.reduce((sum, item) => sum + item.aiSuggestedScore, 0) / questions.reduce((sum, item) => sum + item.points, 0) : null,
    totalScore: attempt.status === 'Finalized' ? 10 * assessments.reduce((sum, item) => sum + item.finalScore, 0) / 10 : null,
    isComplete: assessments.length === 2 && assessments.every((item) => item.finalScore != null),
    pendingQuestionCount: 2 - assessments.filter((item) => item.finalScore != null).length, assessments });

function send(method, params = {}) {
    const callId = ++nextId;
    return new Promise((resolve, reject) => { pending.set(callId, { resolve, reject }); socket.send(JSON.stringify({ id: callId, method, params })); });
}
async function evaluate(expression) {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
}
async function waitFor(expression, label) {
    for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error(`Timed out: ${label}\n${await evaluate('document.body.innerText')}`);
}
async function click(text, modal = false) {
    const found = await evaluate(`(() => { const root = ${modal ? 'document.querySelector(".ant-modal-confirm")' : 'document'}; const el = [...(root?.querySelectorAll('button') || [])].find(e => e.textContent.trim() === ${JSON.stringify(text)}); if (!el || el.disabled) return false; el.click(); return true; })()`);
    assert.ok(found, `Enabled button: ${text}`);
}
async function input(selector, value) {
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
}
async function choose(selector, value) {
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
}
async function screenshot(name) {
    await delay(300);
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(path.join(output, `${name}.png`), Buffer.from(data, 'base64'));
}
async function fixture(event) {
    const url = new URL(event.request.url), method = event.request.method;
    let status = 200, body;
    if (method === 'OPTIONS') body = {};
    else if (url.pathname.endsWith('/auth/me')) body = user;
    else if (url.pathname.endsWith(`/attempts/${id}/grade`)) {
        writes.push({ method, path: url.pathname });
        await delay(200);
        if (failGrade) { status = 503; body = { detail: 'AI unavailable' }; }
        else {
            assessments = questions.map((q, index) => ({ id: `a${index + 1}`, attemptId: id, questionId: q.questionId, points: q.points,
                studentAnswer: index ? '' : 'Đóng gói giúp bảo vệ dữ liệu.\nVí dụ: dùng private field và getter.',
                aiSuggestedScore: index ? null : 3.2, aiFeedback: index ? null : 'Điểm mạnh: hiểu khái niệm.\nĐiểm yếu: ví dụ chưa đầy đủ.\nÝ còn thiếu: kiểm soát truy cập.',
                aiConfidenceLevel: index ? null : 0.94, finalScore: null, teacherComment: null, finalizedAt: null, finalizedByUserId: null, version: 3 }));
            attempt.status = 'AwaitingReview'; body = assessments;
        }
    } else if (/\/assessments\/a[12]\/final-score$/.test(url.pathname)) {
        const payload = JSON.parse(event.request.postData);
        writes.push({ method, path: url.pathname, payload });
        await delay(150);
        if (failSave) { status = failSave; body = failSave === 400 ? { errors: { FinalScore: ['Điểm bị từ chối trong kiểm thử.'] } } : { detail: 'Assessment version is stale. Reload and retry.' }; }
        else {
            const item = assessments.find((entry) => url.pathname.includes(`/${entry.id}/`));
            assert.equal(payload.version, item.version, 'uses current assessment version');
            Object.assign(item, payload, { finalizedAt: '2026-11-01T02:00:00', finalizedByUserId: user.id, version: item.version + 1 });
            if (assessments.every((entry) => entry.finalScore != null)) attempt.status = 'Finalized';
            body = item;
        }
    } else if (url.pathname.endsWith(`/attempts/${id}`)) { status = failLoad || 200; body = status === 200 ? attempt : { detail: 'Attempt inaccessible' }; }
    else if (url.pathname.endsWith(`/attempts/${id}/questions`)) body = questions;
    else if (url.pathname.endsWith(`/attempts/${id}/turns`)) body = [
        { id: 't2', sequence: 2, speaker: 'AI', questionId: 'q1', contentText: 'Em minh họa thêm với Java?', timestamp: '2026-11-01T01:01:00Z' },
        { id: 't1', sequence: 1, speaker: 'Student', questionId: 'q1', contentText: 'Đóng gói giúp bảo vệ dữ liệu.', timestamp: '2026-11-01T01:00:10Z' },
        { id: 't3', sequence: 3, speaker: 'Student', questionId: 'q1', contentText: 'Ví dụ: dùng private field và getter.', timestamp: '2026-11-01T01:02:00Z' },
    ];
    else if (url.pathname.endsWith(`/attempts/${id}/result`)) {
        resultGetCount++;
        if (failResultOnce) { failResultOnce = false; status = 500; body = {}; }
        else body = result();
    } else if (url.pathname.endsWith('/exam-sessions/s1')) body = { id: 's1', courseId: 'c1', sessionTitle: 'Vấn đáp OOP', questionIds: ['q1', 'q2'] };
    else if (url.pathname.endsWith('/courses/c1')) { status = failCourse ? 500 : 200; body = { id: 'c1', code: 'SWD392', rubrics: [{ id: 'r1', criteria: 'Hiểu đúng khái niệm OOP', weight: 60, maxScore: 5 }, { id: 'r2', criteria: 'Vận dụng ví dụ thực tế', weight: 40, maxScore: 5 }] }; }
    else if (url.pathname.endsWith('/users/student1')) body = { username: 'student1', fullName: 'Sinh viên dữ liệu API' };
    else { status = 404; body = { detail: `Missing fixture: ${url.pathname}` }; apiErrors.push(body.detail); }
    await send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [
        { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: new URL(base).origin },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,OPTIONS' },
    ], body: Buffer.from(JSON.stringify(body)).toString('base64') });
}
try {
    let port;
    for (let i = 0; i < 100; i++) {
        try { port = (await readFile(path.join(output, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await delay(100); }
    }
    assert.ok(port, 'Chrome started');
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = ({ data }) => {
        const event = JSON.parse(data);
        if (event.id) {
            const request = pending.get(event.id); pending.delete(event.id);
            if (event.error) request?.reject(new Error(JSON.stringify(event.error))); else request?.resolve(event.result);
        } else if (event.method === 'Runtime.exceptionThrown') runtimeErrors.push(event.params.exceptionDetails);
        else if (event.method === 'Fetch.requestPaused') fixture(event.params).catch((error) => apiErrors.push(error.stack));
    };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token','fixture-token'); localStorage.setItem('auth_user',${JSON.stringify(JSON.stringify(user))}); localStorage.setItem('auth_expires_at','2099-01-01T00:00:00Z');` });
    await send('Fetch.enable', { patterns: [{ urlPattern: '*://localhost:*/api/*' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${base}/grading` });
    await waitFor('!!document.querySelector("#grading-attempt-id")', 'grading entry');
    await input('#grading-attempt-id', 'not-an-id'); await click('Mở bài thi');
    await waitFor('document.body.innerText.includes("Nhập đúng mã lượt thi")', 'invalid attempt id');
    assert.equal(writes.length, 0);
    await input('#grading-attempt-id', id); await click('Mở bài thi');
    await waitFor('document.body.innerText.includes("Sinh viên dữ liệu API")', 'load real-shaped API data');
    assert.equal(await evaluate('document.querySelectorAll(".review-turn").length'), 3);
    assert.ok(await evaluate('document.querySelector(".review-turn").textContent.includes("#1")'), 'transcript ordered by sequence');
    assert.ok(await evaluate('document.body.innerText.includes("Hiểu đúng khái niệm OOP")'), 'API rubric');
    assert.equal(writes.length, 0, 'loading never invokes AI or finalizes');
    await screenshot('submitted-desktop');
    failGrade = true; await click('Chấm gợi ý bằng AI');
    await waitFor('document.body.innerText.includes("Dịch vụ AI chưa sẵn sàng")', 'AI provider failure');
    failGrade = false; await click('Tải lại');
    await waitFor('!document.body.innerText.includes("Cần tải lại dữ liệu")', 'reconciled after AI error');
    await click('Chấm gợi ý bằng AI');
    await waitFor('!!document.querySelector("#override-score")', 'AI proposal loaded');
    assert.equal(await evaluate('document.querySelector("#override-score").value'), '3.2');
    assert.equal(await evaluate('document.querySelector("#override-score").max'), '4');
    assert.equal(assessments.filter((item) => item.finalScore != null).length, 0, 'AI never finalizes');
    await input('#override-score', ''); await click('Chốt điểm câu này');
    await waitFor('document.body.innerText.includes("Vui lòng nhập điểm hợp lệ")', 'blank score validation');
    await input('#override-score', '4.01'); await click('Chốt điểm câu này');
    await waitFor('document.body.innerText.includes("Điểm phải từ 0 đến 4")', 'per-question bounds');
    await input('#override-score', '3.5'); await input('#faculty-notes', '  Giảng viên bổ sung ví dụ.  ');
    await choose('#grading-question', 'q2');
    assert.equal(await evaluate('document.querySelector("#override-score").value'), '', 'no fabricated zero for unanswered question');
    await choose('#grading-question', 'q1');
    assert.equal(await evaluate('document.querySelector("#override-score").value'), '3.5', 'switching preserves draft');
    await screenshot('review-desktop');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await screenshot('review-mobile');
    assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'no mobile overflow');
    failSave = 400; await click('Chốt điểm câu này'); await click('Chốt điểm câu này', true);
    await waitFor('document.body.innerText.includes("Điểm bị từ chối") && !document.querySelector(".ant-modal-confirm")', 'save error');
    assert.equal(await evaluate('document.querySelector("#faculty-notes").value'), '  Giảng viên bổ sung ví dụ.  ', 'failed save preserves comment');
    failSave = 0; await click('Chốt điểm câu này'); await click('Chốt điểm câu này', true);
    await waitFor('!!document.querySelector(".official-question-score") && !document.querySelector(".ant-modal-confirm")', 'first final score locked');
    assert.deepEqual(writes.filter((write) => write.method === 'PUT').at(-1).payload, { finalScore: 3.5, teacherComment: 'Giảng viên bổ sung ví dụ.', version: 3 });
    assert.equal(result().totalScore, null, 'no official total with questions pending');
    await choose('#grading-question', 'q2'); await input('#override-score', '0'); await input('#faculty-notes', 'Không trả lời.');
    failSave = 409; await click('Chốt điểm câu này'); await click('Chốt điểm câu này', true);
    await waitFor('document.body.innerText.includes("Cần tải lại dữ liệu") && !document.querySelector(".ant-modal-confirm")', 'stale version conflict');
    assert.ok(await evaluate('document.querySelector("#override-score").disabled'), 'stale data cannot finalize');
    failSave = 0; assessments[1].version = 4;
    await click('Tải lại'); await click('Bỏ thay đổi', true);
    await waitFor('document.querySelector("#override-score") && !document.querySelector("#override-score").disabled && !document.querySelector(".ant-modal-confirm")', 'refresh newest version');
    await input('#override-score', '0'); await input('#faculty-notes', 'Không trả lời.');
    failResultOnce = true;
    await click('Chốt điểm câu này'); await click('Chốt điểm câu này', true);
    await waitFor('document.body.innerText.includes("Chưa tải lại được kết quả") && !document.querySelector(".ant-modal-confirm")', 'committed write with failed refresh');
    assert.equal(assessments[1].finalScore, 0, 'zero final score saved');
    assert.ok(await evaluate('!document.querySelector("#override-score")'), 'committed question stays locked');
    await click('Tải lại');
    await waitFor('document.body.innerText.includes("Bài thi đã chốt điểm chính thức")', 'authoritative final result');
    assert.equal(result().totalScore, 3.5);
    await screenshot('finalized-mobile');
    await send('Page.reload');
    await waitFor('document.body.innerText.includes("Bài thi đã chốt điểm chính thức")', 'final scores persist across reload');
    failCourse = true; await click('Tải lại');
    await waitFor('document.body.innerText.includes("Không tải được rubric môn học")', 'optional rubric failure');
    assert.equal(await evaluate('document.querySelectorAll(".review-turn").length'), 3, 'rubric failure preserves transcript');
    failCourse = false; failLoad = 403; await send('Page.reload');
    await waitFor('document.body.innerText.includes("không có quyền chấm bài")', 'ownership failure');
    failLoad = 404; await click('Thử lại');
    await waitFor('document.body.innerText.includes("Không tìm thấy dữ liệu")', 'missing attempt');
    failLoad = 0; await click('Thử lại');
    await waitFor('document.body.innerText.includes("Bài thi đã chốt điểm chính thức")', 'retry succeeds');
    await send('Page.navigate', { url: `${base}/grading/review?attemptId=${id}` });
    await waitFor('document.body.innerText.includes("Bài thi đã chốt điểm chính thức")', 'review alias');
    assert.ok(resultGetCount > 5);
    assert.equal(runtimeErrors.length, 0, JSON.stringify(runtimeErrors));
    assert.equal(apiErrors.length, 0, JSON.stringify(apiErrors));
    console.log('PASS: Flow 4 API fixtures, transcript/rubric, AI error/retry, score validation, drafts, save/version conflicts, partial/final totals, reload, optional failures, ownership, mobile.');
    console.log(`Screenshots: ${output}`);
} finally {
    if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch { /* closed */ } socket.close(); }
    chrome.kill();
}
