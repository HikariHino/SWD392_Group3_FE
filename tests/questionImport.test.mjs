import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImportPayload, createCsvTemplate, IMPORT_EXAMPLE, parseCsv, parseQuestionFile, validateImportQuestions } from '../src/utils/questionImport.js';
import { summarizeQuestions } from '../src/utils/questionStatistics.js';

test('JSON array and envelope accept BOM, Bloom names and numeric levels', () => {
    const rows = parseQuestionFile('\uFEFF' + JSON.stringify({ questions: [{ ...IMPORT_EXAMPLE[0], bloomLevel: 'Understand' }] }), 'questions.JSON');
    assert.deepEqual(rows, IMPORT_EXAMPLE);
    assert.deepEqual(parseQuestionFile(JSON.stringify(rows), 'q.json'), rows);
    assert.deepEqual(validateImportQuestions(rows), []);
});
test('downloadable CSV template round-trips rubrics and Vietnamese text', () => {
    assert.deepEqual(parseQuestionFile(createCsvTemplate(), 'q.csv'), IMPORT_EXAMPLE);
});
test('CSV preserves quoted commas, newlines and escaped quotes', () => {
    assert.deepEqual(parseCsv('a,b\r\n"hello, world","line1\nline2 ""quote"""\r\n'), [['a', 'b'], ['hello, world', 'line1\nline2 "quote"']]);
    assert.throws(() => parseCsv('a,"unclosed'), /ngoặc kép/);
    assert.throws(() => parseCsv('"a"x,b'), /ký tự thừa/);
});
test('malformed or empty uploads are rejected before API import', () => {
    for (const [text, name] of [['{}', 'q.json'], ['[]', 'q.json'], ['[null]', 'q.json'], ['oops', 'q.json'], ['content,bloomLevel\nx,2', 'q.csv'], ['', 'q.xlsx']]) {
        assert.throws(() => parseQuestionFile(text, name));
    }
    assert.throws(() => parseQuestionFile(JSON.stringify(Array(501).fill(IMPORT_EXAMPLE[0])), 'q.json'), /500/);
    assert.throws(() => parseQuestionFile('content,bloomLevel,rubrics\nx,2,invalid', 'q.csv'), /Bản ghi 1/);
});
test('invalid criteria, numbers, weights and Bloom block persistence', () => {
    const rows = parseQuestionFile(JSON.stringify([{ content: '', bloomLevel: 99, rubrics: [{ criteria: '', weight: -1, maxScore: 0 }] }]), 'q.json');
    assert.ok(validateImportQuestions(rows).length >= 6);
    assert.throws(() => buildImportPayload(rows, 'course-a'));
    const wrongTotal = structuredClone(IMPORT_EXAMPLE);
    wrongTotal[0].rubrics[0].weight = 50;
    assert.ok(validateImportQuestions(wrongTotal).some((e) => e.includes('100%')));
    wrongTotal[0].rubrics[0].weight = NaN;
    assert.ok(validateImportQuestions(wrongTotal).some((e) => e.includes('trọng số')));
});
test('duplicate questions within a file are rejected independent of case and whitespace', () => {
    const rows = [...IMPORT_EXAMPLE, { ...IMPORT_EXAMPLE[0], content: ' ' + IMPORT_EXAMPLE[0].content.toUpperCase() + ' ' }];
    assert.ok(validateImportQuestions(rows).some((e) => e.includes('trùng nội dung')));
});
test('selected course overrides every imported course and empty batches are blocked', () => {
    const source = [{ ...IMPORT_EXAMPLE[0], courseId: 'wrong-course' }];
    const payload = buildImportPayload(source, 'selected-course');
    assert.equal(payload.courseId, 'selected-course');
    assert.equal(payload.questions[0].courseId, 'selected-course');
    assert.equal(source[0].courseId, 'wrong-course');
    assert.throws(() => buildImportPayload([], 'course'));
    assert.throws(() => buildImportPayload(IMPORT_EXAMPLE, ''));
});
test('statistics include empty courses, missing rubrics and course filtering', () => {
    const courses = [{ id: 'a' }, { id: 'b' }, { id: 'empty' }];
    const questions = [{ courseId: 'a', bloomLevel: 1, rubrics: [{}, {}] }, { courseId: 'a', bloomLevel: 2, rubrics: [] }, { courseId: 'b', bloomLevel: 1, rubrics: [{}] }];
    const all = summarizeQuestions(questions, courses);
    assert.equal(all.total, 3); assert.equal(all.rubricCount, 3); assert.equal(all.coverage, 67);
    assert.equal(all.blooms[0].count, 2); assert.equal(all.courses[2].questionCount, 0);
    const filtered = summarizeQuestions(questions, courses, 'a');
    assert.equal(filtered.total, 2); assert.equal(filtered.rubricCount, 2); assert.equal(filtered.coverage, 50);
    assert.equal(filtered.courses.length, 1);
    assert.equal(summarizeQuestions([], []).coverage, 0);
});
