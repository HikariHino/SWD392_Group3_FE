// Run with Vite on http://127.0.0.1:5173. Browser requests use mock API fixtures;
// this never creates questions or users in the configured backend database.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { IMPORT_EXAMPLE } from '../src/utils/questionImport.js';

const output = path.resolve('.ui-smoke.local', String(Date.now()));
await mkdir(output, { recursive: true });
const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${output}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pending = new Map();
let socket, nextId = 0;
const runtimeErrors = [], apiErrors = [], requestedPages = [];
let imported = null, failQuestions = false;
let generated = null, savedQuestion = null, generationCount = 0, failGeneration = false, invalidGeneration = false, failSave = false;
const user = { id: 'lecturer-test', username: 'lecturer', fullName: 'ThS. Nguyễn Văn C', role: 'Lecturer' };
const courseId = '11111111-1111-1111-1111-111111111111';
const courses = [{ id: courseId, code: 'SWD392', name: 'Software Design' }, { id: '22222222-2222-2222-2222-222222222222', code: 'PRN231', name: '.NET' }];
const questions = Array.from({ length: 101 }, (_, i) => ({ ...structuredClone(IMPORT_EXAMPLE[0]), id: `q-${String(i).padStart(8, '0')}`, content: `Câu hỏi thống kê ${i + 1}`, courseId, courseCode: 'SWD392', courseName: 'Software Design', createdAt: '2026-10-18T08:00:00Z', rubrics: IMPORT_EXAMPLE[0].rubrics.map((r, ri) => ({ ...r, id: `r-${i}-${ri}` })) }));
function send(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
}
async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
    return result.result.value;
}
async function waitFor(expression, label) {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error(`Timed out: ${label}\n${await evaluate('document.body.innerText')}`);
}
async function clickText(text) {
    const found = await evaluate(`(() => { const el = [...document.querySelectorAll('button,a')].find(e => e.textContent.trim() === ${JSON.stringify(text)}); el?.click(); return !!el; })()`);
    assert.ok(found, `Button/link exists: ${text}`);
}
async function input(selector, value) {
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
}
async function screenshot(name, captureBeyondViewport = true) {
    await delay(500); // Allow layout transitions and Ant Design chart animations to settle.
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport });
    await writeFile(path.join(output, name + '.png'), Buffer.from(data, 'base64'));
}
async function fulfill(event) {
    const url = new URL(event.request.url);
    let status = 200, body;
    if (event.request.method === 'OPTIONS') body = {};
    else if (url.pathname.endsWith('/auth/login')) body = { accessToken: 'fixture-token', user, expiresAt: '2099-01-01T00:00:00Z' };
    else if (url.pathname.endsWith('/auth/me')) body = user;
    else if (event.request.headers.Authorization !== 'Bearer fixture-token' && event.request.headers.authorization !== 'Bearer fixture-token') { status = 401; body = { title: 'Unauthorized' }; }
    else if (url.pathname.endsWith('/questions/courses')) body = courses;
    else if (url.pathname.endsWith('/questions/ai-generate')) {
        generationCount++;
        generated = JSON.parse(event.request.postData);
        await delay(300);
        if (failGeneration) { status = 503; body = { message: 'Dịch vụ AI tạm thời không khả dụng' }; }
        else if (invalidGeneration) body = {};
        else body = { ...structuredClone(IMPORT_EXAMPLE[0]), ...generated, content: 'Bản nháp AI về Onion Architecture' };
    }
    else if (url.pathname.endsWith('/questions/import')) {
        imported = JSON.parse(event.request.postData);
        body = { message: 'Đã import thành công' }; status = 201;
    } else if (url.pathname.endsWith('/questions')) {
        if (event.request.method === 'POST') {
            if (failSave) { status = 400; body = { message: 'Không thể lưu bản nháp lúc này' }; }
            else {
                savedQuestion = JSON.parse(event.request.postData);
                body = { ...structuredClone(savedQuestion), id: 'ai-saved-question', courseCode: 'SWD392', createdAt: '2026-10-19T08:00:00Z', rubrics: savedQuestion.rubrics.map((r, i) => ({ ...r, id: `ai-r-${i}` })) };
                questions.unshift(body); status = 201;
            }
        } else if (failQuestions) { status = 500; body = { title: 'Lỗi kiểm thử kết nối' }; }
        else {
            const index = Number(url.searchParams.get('pageIndex') || 1), size = Number(url.searchParams.get('pageSize') || 10);
            requestedPages.push(index);
            body = { items: questions.slice((index - 1) * size, index * size), totalCount: questions.length, pageIndex: index, pageSize: size };
        }
    } else { status = 404; body = { title: 'No fixture for route' }; }
    await send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [
        { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:5173' },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
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
        else if (event.method === 'Fetch.requestPaused') fulfill(event.params).catch((error) => apiErrors.push(error.message));
    };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Fetch.enable', { patterns: [{ urlPattern: '*://localhost:*/api/*' }] });
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/reports' });
    await waitFor('!!document.querySelector("#username")', 'unauthenticated route redirects to login');
    assert.equal(await evaluate('location.pathname'), '/login');
    await input('#username', 'lecturer'); await input('#password', 'password123'); await clickText('Đăng nhập');
    await waitFor('document.body.innerText.includes("Câu hỏi thống kê 101") || document.querySelectorAll(".ant-statistic-content")[0]?.textContent === "101"', 'all report pages loaded');
    assert.equal(await evaluate('location.pathname'), '/reports');
    assert.ok(requestedPages.includes(2), 'statistics fetch second page');
    assert.ok(await evaluate('document.body.innerText.includes("ThS. Nguyễn Văn C") && document.body.innerText.includes("Giảng viên (Lecturer)")'));
    await screenshot('reports-desktop');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await screenshot('reports-mobile');
    assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'mobile reports have no document overflow');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    failQuestions = true; await clickText('Tải lại');
    await waitFor('document.body.innerText.includes("Lỗi kiểm thử kết nối")', 'report error displayed');
    failQuestions = false; await clickText('Tải lại');
    await waitFor('!document.body.innerText.includes("Lỗi kiểm thử kết nối") && !document.querySelector(".ant-spin-spinning")', 'report retry succeeds');
    await clickText('Nhập câu hỏi từ tài liệu');
    await waitFor('!!document.querySelector("input[type=file]")', 'import page');
    await waitFor('!document.querySelector(".ant-select-loading")', 'courses loaded');
    await evaluate('document.querySelector("#import-course").dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }))');
    await waitFor('!!document.querySelector(".ant-select-item-option")', 'course options');
    await evaluate('document.querySelector(".ant-select-item-option").click()');
    const upload = async (name, data) => {
        const filename = path.join(output, name); await writeFile(filename, JSON.stringify(data));
        const { root } = await send('DOM.getDocument');
        const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file]' });
        await send('DOM.setFileInputFiles', { nodeId, files: [filename] });
    };
    const invalid = structuredClone(IMPORT_EXAMPLE); invalid[0].rubrics[0].weight = 10;
    await upload('invalid.json', invalid);
    await waitFor('document.body.innerText.includes("tổng trọng số rubric phải bằng 100%")', 'invalid rubric shown');
    assert.ok(await evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.includes("Lưu 1 câu hỏi")).disabled'));
    await upload('valid.json', IMPORT_EXAMPLE);
    await waitFor('document.body.innerText.includes("Dữ liệu hợp lệ")', 'valid preview');
    await screenshot('import-desktop');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await screenshot('import-preview-mobile');
    assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'mobile import preview has no document overflow');
    await clickText('Lưu 1 câu hỏi vào ngân hàng');
    await waitFor('document.body.innerText.includes("Đã lưu 1 câu hỏi")', 'import success');
    assert.equal(imported.courseId, courseId); assert.equal(imported.questions[0].courseId, courseId);
    assert.equal(imported.questions[0].rubrics.length, 2);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await screenshot('import-mobile');
    assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'mobile has no document overflow');
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/questions' });
    await waitFor('!!document.querySelector(".question-card")', 'question bank');
    await clickText('Sinh bằng AI Gemini');
    await clickText('Sinh câu hỏi');
    await waitFor('document.body.innerText.includes("Vui lòng nhập chủ đề câu hỏi.")', 'AI required fields');
    assert.equal(generationCount, 0, 'invalid form does not call AI');
    await evaluate('document.querySelector("#ai-question_courseId").dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }))');
    await waitFor('!!document.querySelector(".ant-select-item-option")', 'AI courses');
    await evaluate('document.querySelector(".ant-select-item-option").click()');
    await input('#ai-question_topic', '   '); await clickText('Sinh câu hỏi');
    await delay(200); assert.equal(generationCount, 0, 'blank topic rejected');
    await input('#ai-question_topic', '  Onion Architecture  ');
    failGeneration = true; await clickText('Sinh câu hỏi');
    await waitFor('document.body.innerText.includes("Dịch vụ AI tạm thời không khả dụng")', 'AI error');
    assert.equal(await evaluate('document.querySelector("#ai-question_topic").value'), '  Onion Architecture  ');
    failGeneration = false; invalidGeneration = true; await clickText('Sinh câu hỏi');
    await waitFor('document.body.innerText.includes("Máy chủ trả về bản nháp không hợp lệ")', 'malformed AI response');
    invalidGeneration = false; await clickText('Sinh câu hỏi');
    await waitFor('document.body.innerText.includes("Đang sinh câu hỏi và Rubric")', 'AI loading');
    assert.ok(await evaluate('document.querySelector("#ai-question_topic").disabled'), 'form locked during generation');
    await waitFor('document.body.innerText.includes("Xem và chỉnh sửa câu hỏi AI")', 'AI editable preview');
    assert.deepEqual(generated, { courseId, topic: 'Onion Architecture', bloomLevel: 4 });
    assert.equal(savedQuestion, null, 'generation does not save');
    assert.equal(await evaluate('document.querySelector("#content").value'), 'Bản nháp AI về Onion Architecture');
    await input('#rubrics_0_weight', '10'); await clickText('Lưu vào ngân hàng');
    await waitFor('document.body.innerText.includes("phải bằng đúng 100%")', 'generated rubric validation');
    assert.equal(savedQuestion, null, 'invalid rubric cannot save');
    await input('#rubrics_0_weight', String(IMPORT_EXAMPLE[0].rubrics[0].weight));
    await input('#content', 'Câu hỏi AI đã được giảng viên chỉnh sửa');
    await screenshot('ai-preview-mobile', false);
    assert.ok(await evaluate('(() => { const modal = document.querySelector(".ant-modal"); const bounds = modal.getBoundingClientRect(); return [...modal.querySelectorAll("input,textarea")].every(field => { const rect = field.getBoundingClientRect(); return rect.width === 0 || (rect.left >= bounds.left && rect.right <= bounds.right); }); })()'), 'AI preview fields fit modal width');
    assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'AI mobile has no document overflow');
    failSave = true; await clickText('Lưu vào ngân hàng');
    await waitFor('document.body.innerText.includes("Không thể lưu bản nháp lúc này")', 'save error retains draft');
    assert.equal(await evaluate('document.querySelector("#content").value'), 'Câu hỏi AI đã được giảng viên chỉnh sửa');
    failSave = false; await clickText('Lưu vào ngân hàng');
    await waitFor('document.querySelector(".question-card h3")?.textContent.includes("Câu hỏi AI đã được giảng viên chỉnh sửa")', 'saved question refreshed');
    assert.equal(savedQuestion.courseId, courseId);
    assert.equal(savedQuestion.bloomLevel, 4);
    assert.equal(savedQuestion.rubrics.reduce((sum, r) => sum + r.weight, 0), 100);
    await clickText('Sinh bằng AI Gemini');
    await waitFor('!!document.querySelector("#ai-question_topic")', 'AI reopened');
    assert.equal(await evaluate('document.querySelector("#ai-question_topic").value'), '', 'new generation starts clean');
    await clickText('Huỷ');
    await clickText('Đăng xuất');
    await waitFor('location.pathname === "/login"', 'logout redirect');
    assert.equal(await evaluate('localStorage.getItem("token")'), null);
    assert.equal(await evaluate('localStorage.getItem("auth_user")'), null);
    user.role = 'Student';
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/reports' });
    await waitFor('!!document.querySelector("#username")', 'student login form');
    await input('#username', 'student'); await input('#password', 'password123'); await clickText('Đăng nhập');
    await waitFor('location.pathname === "/unauthorized"', 'Student denied Lecturer route');
    assert.equal(runtimeErrors.length, 0, JSON.stringify(runtimeErrors));
    assert.equal(apiErrors.length, 0, JSON.stringify(apiErrors));
    console.log('PASS: login, guarded routes, reports, import, AI validation/error/retry/preview/edit/save, mobile layout and logout (mock API).');
    console.log(`Screenshots: ${output}`);
} finally {
    if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch { /* browser closed */ } socket.close(); }
    chrome.kill();
}
