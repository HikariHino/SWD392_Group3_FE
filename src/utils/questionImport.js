import { BLOOM_LEVELS } from './bloomLevel.js';

export const MAX_IMPORT_QUESTIONS = 500;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

// CSV supports escaped quotes, commas and line breaks inside quoted cells.
export function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', quoted = false, closed = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (char === '"') { quoted = false; closed = true; }
            else cell += char;
        } else if (char === ',' || char === '\n' || char === '\r') {
            row.push(cell); cell = ''; closed = false;
            if (char !== ',') {
                if (row.some((value) => value.trim())) rows.push(row);
                row = [];
                if (char === '\r' && text[i + 1] === '\n') i++;
            }
        } else if (char === '"') {
            if (cell || closed) throw new Error('CSV có dấu ngoặc kép không hợp lệ. Hãy dùng file mẫu.');
            quoted = true;
        } else {
            if (closed) throw new Error('CSV có ký tự thừa sau ô được đặt trong dấu ngoặc kép.');
            cell += char;
        }
    }
    if (quoted) throw new Error('CSV chưa đóng dấu ngoặc kép.');
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
    return rows;
}

export function parseQuestionFile(text, filename) {
    text = text.replace(/^\uFEFF/, '');
    let questions;
    if (/\.json$/i.test(filename)) {
        let value;
        try { value = JSON.parse(text); } catch { throw new Error('JSON không hợp lệ. Kiểm tra dấu phẩy và dấu ngoặc.'); }
        questions = Array.isArray(value) ? value : value?.questions;
    } else if (/\.csv$/i.test(filename)) {
        const [header, ...rows] = parseCsv(text);
        const columns = ['content', 'bloomLevel'].map((name) => header?.findIndex((value) => value.toLowerCase() === name.toLowerCase()));
        if (columns.some((index) => index === undefined || index < 0)) {
            throw new Error('CSV cần các cột content,bloomLevel. Hãy tải file mẫu.');
        }
        questions = rows.map((row, index) => {
            if (row.length !== header.length) throw new Error(`Bản ghi ${index + 1}: số cột CSV không khớp.`);
            return { content: row[columns[0]], bloomLevel: row[columns[1]] };
        });
    } else throw new Error('Chỉ hỗ trợ file .json hoặc .csv (UTF-8).');
    if (!Array.isArray(questions) || !questions.length) throw new Error('File phải chứa danh sách câu hỏi không rỗng.');
    if (questions.length > MAX_IMPORT_QUESTIONS) throw new Error(`Mỗi lần nhập tối đa ${MAX_IMPORT_QUESTIONS} câu hỏi.`);
    return questions.map((question, index) => {
        if (!question || typeof question !== 'object' || Array.isArray(question)) throw new Error(`Câu ${index + 1}: dữ liệu không hợp lệ.`);
        const bloom = BLOOM_LEVELS.find((level) => level.value === Number(question.bloomLevel) || level.name.toLowerCase() === String(question.bloomLevel).toLowerCase());
        return {
            content: typeof question.content === 'string' ? question.content.trim() : '',
            bloomLevel: bloom?.value ?? null,
            rubrics: Array.isArray(question.rubrics) ? question.rubrics : [],
        };
    });
}

export function validateImportQuestions(questions) {
    const errors = [];
    if (!questions.length) errors.push('Cần ít nhất một câu hỏi.');
    if (questions.length > MAX_IMPORT_QUESTIONS) errors.push(`Tối đa ${MAX_IMPORT_QUESTIONS} câu hỏi mỗi lần nhập.`);
    const seen = new Set();
    questions.forEach((question, index) => {
        const prefix = `Câu ${index + 1}`;
        if (!question.content.trim() || question.content.length > 2000) errors.push(`${prefix}: nội dung cần từ 1 đến 2000 ký tự.`);
        const normalized = question.content.trim().toLocaleLowerCase('vi');
        if (seen.has(normalized)) errors.push(`${prefix}: trùng nội dung với câu khác trong danh sách.`);
        seen.add(normalized);
        if (!BLOOM_LEVELS.some((level) => level.value === question.bloomLevel)) errors.push(`${prefix}: chọn mức Bloom từ 1 đến 6.`);
    });
    return errors;
}

export function buildImportPayload(questions, courseId) {
    if (!courseId) throw new Error('Vui lòng chọn môn học.');
    const errors = validateImportQuestions(questions);
    if (errors.length) throw new Error(errors[0]);
    // All rows belong to the selected course, even if the file contains other course IDs.
    const rows = ['Content,BloomLevel', ...questions.map((question) => {
        const bloom = BLOOM_LEVELS.find((level) => level.value === question.bloomLevel);
        return [csvCell(question.content.replace(/\r?\n/g, ' ')), bloom.name].join(',');
    })];
    return { courseId, file: new File(['\uFEFF', rows.join('\r\n')], 'questions.csv', { type: 'text/csv' }) };
}

export const IMPORT_EXAMPLE = [{
    content: 'Giải thích nguyên lý Dependency Inversion và cho một ví dụ.',
    bloomLevel: 2,
    rubrics: [],
}];

export const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
export function createCsvTemplate() {
    return 'Content,BloomLevel\r\n' + IMPORT_EXAMPLE.map((q) => [csvCell(q.content), BLOOM_LEVELS.find((level) => level.value === q.bloomLevel).name].join(',')).join('\r\n');
}

export function downloadText(content, filename, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
