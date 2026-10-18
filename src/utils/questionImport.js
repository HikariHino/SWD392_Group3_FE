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
        const columns = ['content', 'bloomLevel', 'rubrics'].map((name) => header?.indexOf(name));
        if (columns.some((index) => index === undefined || index < 0)) {
            throw new Error('CSV cần các cột content,bloomLevel,rubrics. Hãy tải file mẫu.');
        }
        questions = rows.map((row, index) => {
            if (row.length !== header.length) throw new Error(`Bản ghi ${index + 1}: số cột CSV không khớp.`);
            let rubrics;
            try { rubrics = JSON.parse(row[columns[2]]); }
            catch { throw new Error(`Bản ghi ${index + 1}: rubrics phải là một mảng JSON hợp lệ.`); }
            return { content: row[columns[0]], bloomLevel: row[columns[1]], rubrics };
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
            rubrics: Array.isArray(question.rubrics) ? question.rubrics.map((rubric) => ({
                criteria: typeof rubric?.criteria === 'string' ? rubric.criteria.trim() : '',
                weight: typeof rubric?.weight === 'number' ? rubric.weight : NaN,
                maxScore: typeof rubric?.maxScore === 'number' ? rubric.maxScore : NaN,
            })) : [],
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
        if (!question.rubrics.length) errors.push(`${prefix}: cần ít nhất một tiêu chí rubric.`);
        question.rubrics.forEach((rubric, ri) => {
            if (!rubric.criteria.trim() || rubric.criteria.length > 500) errors.push(`${prefix}, tiêu chí ${ri + 1}: nội dung cần từ 1 đến 500 ký tự.`);
            if (!Number.isFinite(rubric.weight) || rubric.weight <= 0 || rubric.weight > 100) errors.push(`${prefix}, tiêu chí ${ri + 1}: trọng số phải lớn hơn 0 và không quá 100.`);
            if (!Number.isFinite(rubric.maxScore) || rubric.maxScore <= 0 || rubric.maxScore > 100) errors.push(`${prefix}, tiêu chí ${ri + 1}: điểm tối đa phải lớn hơn 0 và không quá 100.`);
        });
        const total = question.rubrics.reduce((sum, rubric) => sum + rubric.weight, 0);
        if (!Number.isFinite(total) || Math.abs(total - 100) >= 0.01) errors.push(`${prefix}: tổng trọng số rubric phải bằng 100%.`);
    });
    return errors;
}

export function buildImportPayload(questions, courseId) {
    if (!courseId) throw new Error('Vui lòng chọn môn học.');
    const errors = validateImportQuestions(questions);
    if (errors.length) throw new Error(errors[0]);
    // All rows belong to the selected course, even if the file contains other course IDs.
    return { courseId, questions: questions.map((question) => ({ ...question, courseId })) };
}

export const IMPORT_EXAMPLE = [{
    content: 'Giải thích nguyên lý Dependency Inversion và cho một ví dụ.',
    bloomLevel: 2,
    rubrics: [
        { criteria: 'Giải thích đúng nguyên lý', weight: 60, maxScore: 6 },
        { criteria: 'Ví dụ phù hợp', weight: 40, maxScore: 4 },
    ],
}];

export const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
export function createCsvTemplate() {
    return 'content,bloomLevel,rubrics\r\n' + IMPORT_EXAMPLE.map((q) => [q.content, q.bloomLevel, JSON.stringify(q.rubrics)].map(csvCell).join(',')).join('\r\n');
}

export function downloadText(content, filename, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
