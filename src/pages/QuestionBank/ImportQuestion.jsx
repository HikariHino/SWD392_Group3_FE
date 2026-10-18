import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, App, Button, Card, Input, InputNumber, Result, Select, Space, Steps, Table, Tag, Upload } from 'antd';
import { DeleteOutlined, DownloadOutlined, InboxOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { questionApi } from '../../services/questionApi';
import { BLOOM_LEVEL_OPTIONS } from '../../utils/bloomLevel';
import { parseApiError } from '../../utils/apiError';
import { buildImportPayload, createCsvTemplate, downloadText, IMPORT_EXAMPLE, MAX_IMPORT_BYTES, parseQuestionFile, validateImportQuestions } from '../../utils/questionImport';
import '../../styles/WorkspacePages.css';

export default function ImportQuestion() {
    const { message } = App.useApp();
    const [courses, setCourses] = useState([]);
    const [courseId, setCourseId] = useState();
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [courseError, setCourseError] = useState('');
    const [questions, setQuestions] = useState([]);
    const [filename, setFilename] = useState('');
    const [reading, setReading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [savedCount, setSavedCount] = useState(0);
    const inFlight = useRef(false);
    const fileVersion = useRef(0);
    const errors = validateImportQuestions(questions);

    const loadCourses = async () => {
        setCoursesLoading(true); setCourseError('');
        try { const { data } = await questionApi.getCourses(); setCourses(data); }
        catch (err) { setCourseError(parseApiError(err).message); }
        finally { setCoursesLoading(false); }
    };
    useEffect(() => {
        const timer = window.setTimeout(loadCourses, 0);
        return () => window.clearTimeout(timer);
    }, []);

    const readFile = async (file) => {
        const version = ++fileVersion.current;
        setError(''); setQuestions([]); setSavedCount(0); setFilename(''); setReading(true);
        try {
            if (file.size > MAX_IMPORT_BYTES) throw new Error('File vượt quá giới hạn 2 MB.');
            const parsed = parseQuestionFile(await file.text(), file.name);
            if (version === fileVersion.current) { setQuestions(parsed); setFilename(file.name); }
        } catch (err) { if (version === fileVersion.current) setError(err.message); }
        finally { if (version === fileVersion.current) setReading(false); }
        return Upload.LIST_IGNORE;
    };
    const editQuestion = (index, patch) => setQuestions((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
    const editRubric = (index, ri, patch) => editQuestion(index, { rubrics: questions[index].rubrics.map((r, i) => i === ri ? { ...r, ...patch } : r) });
    const save = async () => {
        if (inFlight.current) return;
        inFlight.current = true; setSaving(true); setError('');
        try {
            const payload = buildImportPayload(questions, courseId);
            await questionApi.importQuestions(payload);
            setSavedCount(questions.length); setQuestions([]);
            message.success('Đã lưu câu hỏi và rubric vào ngân hàng.');
        } catch (err) {
            if (err.response) {
                const details = parseApiError(err);
                setError([details.message, ...details.fieldErrors.map((field) => `${field.name.join('.')}: ${field.error}`)].join('\n'));
            } else if (err.request) setError('Chưa xác nhận được kết quả lưu do mất kết nối. Kiểm tra ngân hàng câu hỏi trước khi gửi lại để tránh nhập trùng.');
            else setError(err.message);
        } finally { inFlight.current = false; setSaving(false); }
    };
    return (
        <div className="workspace-page">
            <div className="workspace-heading"><div><span className="page-kicker">HỌC LIỆU · NGÂN HÀNG CÂU HỎI</span><h1>Nhập câu hỏi từ tài liệu</h1><p>Chọn môn học, kiểm tra câu hỏi và rubric trước khi lưu vào ngân hàng.</p></div><Link className="btn btn-secondary" to="/questions">Xem ngân hàng câu hỏi</Link></div>
            <Steps current={savedCount ? 2 : questions.length ? 1 : 0} items={[{ title: 'Chọn dữ liệu' }, { title: 'Kiểm tra & chỉnh sửa' }, { title: 'Đã lưu' }]} />
            <Alert type="info" showIcon title="Định dạng đang hỗ trợ: JSON và CSV" description="Có thể xuất CSV UTF-8 từ Excel theo file mẫu. Giáo trình PDF, slide PowerPoint và truy xuất RAG chưa được hỗ trợ; chỉ tải lên danh sách câu hỏi đã có rubric." />
            {savedCount > 0 ? <Card><Result status="success" title={`Đã lưu ${savedCount} câu hỏi`} subTitle={`Môn học: ${courses.find((c) => c.id === courseId)?.name ?? ''}. Các câu hỏi đã có trong ngân hàng chính thức.`} extra={<Space wrap><Link className="btn btn-primary" to="/questions">Mở ngân hàng câu hỏi</Link><Button onClick={() => { setSavedCount(0); setFilename(''); }}>Nhập danh sách khác</Button></Space>} /></Card> : <>
                <div className="workspace-two-columns">
                    <Card title="1. Môn học & file câu hỏi">
                        <label className="field-label" htmlFor="import-course">Môn học áp dụng cho toàn bộ câu hỏi</label>
                        <Select id="import-course" className="full-width" placeholder="Chọn môn học" value={courseId} onChange={setCourseId} loading={coursesLoading} disabled={saving} showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} />
                        {courseError && <Alert type="error" title={courseError} action={<Button onClick={loadCourses} icon={<ReloadOutlined />}>Thử lại</Button>} />}
                        {!coursesLoading && !courseError && !courses.length && <Alert type="warning" title="Chưa có môn học. Cần tạo môn học trên hệ thống trước khi nhập câu hỏi." />}
                        <div className="upload-area"><Upload.Dragger accept=".json,.csv" beforeUpload={readFile} showUploadList={false} multiple={false} disabled={saving || reading}><p className="ant-upload-drag-icon"><InboxOutlined /></p><p className="ant-upload-text">{reading ? 'Đang đọc file…' : 'Kéo thả hoặc chọn file câu hỏi'}</p><p className="ant-upload-hint">JSON / CSV · Tối đa 2 MB và 500 câu hỏi</p></Upload.Dragger></div>
                        {filename && <Tag color="blue">{filename}</Tag>}
                    </Card>
                    <Card title="Tải mẫu để bắt đầu">
                        <p>Mỗi câu hỏi cần nội dung, mức Bloom (1–6) và danh sách rubric gồm tiêu chí, trọng số, điểm tối đa.</p>
                        <p>Tổng trọng số mỗi câu phải bằng <strong>100%</strong>. Với CSV, cột <code>rubrics</code> chứa một mảng JSON; file mẫu đã định dạng sẵn.</p>
                        <Space wrap><Button icon={<DownloadOutlined />} onClick={() => downloadText(JSON.stringify(IMPORT_EXAMPLE, null, 2), 'cau-hoi-mau.json', 'application/json')}>Mẫu JSON</Button><Button icon={<DownloadOutlined />} onClick={() => downloadText(createCsvTemplate(), 'cau-hoi-mau.csv', 'text/csv;charset=utf-8')}>Mẫu CSV</Button></Space>
                        <p className="muted-text">File được đọc để xem trước trên trình duyệt. Chỉ các câu hỏi bạn xác nhận mới được gửi lên hệ thống.</p>
                    </Card>
                </div>
                {error && <Alert type="error" showIcon title="Chưa hoàn thành thao tác" description={<div className="preserve-lines">{error}</div>} />}
                {questions.length > 0 && <Card title={`2. Kiểm tra ${questions.length} câu hỏi`} extra={<Tag color={errors.length ? 'orange' : 'green'}>{errors.length ? `${errors.length} lỗi cần sửa` : 'Dữ liệu hợp lệ'}</Tag>}>
                    <p>Mở từng dòng để sửa rubric. Các câu hỏi trong file sẽ được gắn vào môn học đã chọn ở trên.</p>
                    {errors.length > 0 && <Alert className="validation-errors" type="warning" showIcon title="Sửa các lỗi sau trước khi lưu" description={<ul>{errors.map((item, i) => <li key={i}>{item}</li>)}</ul>} />}
                    <Table rowKey="index" dataSource={questions.map((q, index) => ({ ...q, index }))} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 700 }} columns={[
                        { title: '#', dataIndex: 'index', width: 50, render: (i) => i + 1 },
                        { title: 'Nội dung câu hỏi', render: (_, q) => <Input.TextArea aria-label={`Nội dung câu ${q.index + 1}`} value={q.content} onChange={(e) => editQuestion(q.index, { content: e.target.value })} autoSize={{ minRows: 2, maxRows: 6 }} disabled={saving} /> },
                        { title: 'Bloom', width: 200, render: (_, q) => <Select aria-label={`Bloom câu ${q.index + 1}`} className="full-width" value={q.bloomLevel} placeholder="Chọn Bloom" options={BLOOM_LEVEL_OPTIONS} onChange={(value) => editQuestion(q.index, { bloomLevel: value })} disabled={saving} /> },
                        { title: 'Rubric', width: 90, render: (_, q) => `${q.rubrics.length} tiêu chí` },
                        { title: '', width: 55, render: (_, q) => <Button danger icon={<DeleteOutlined />} aria-label={`Bỏ câu ${q.index + 1}`} disabled={saving} onClick={() => setQuestions((rows) => rows.filter((_, i) => i !== q.index))} /> },
                    ]} expandable={{ expandedRowRender: (q) => <div className="rubric-editor"><strong>Rubric câu {q.index + 1}</strong>{q.rubrics.map((rubric, ri) => <div className="rubric-edit-row" key={ri}>
                        <Input.TextArea aria-label={`Tiêu chí ${ri + 1} câu ${q.index + 1}`} placeholder="Nội dung tiêu chí" value={rubric.criteria} autoSize onChange={(e) => editRubric(q.index, ri, { criteria: e.target.value })} disabled={saving} />
                        <label>Trọng số (%)<InputNumber aria-label={`Trọng số ${ri + 1} câu ${q.index + 1}`} value={Number.isFinite(rubric.weight) ? rubric.weight : null} onChange={(v) => editRubric(q.index, ri, { weight: v })} disabled={saving} /></label>
                        <label>Điểm tối đa<InputNumber aria-label={`Điểm tối đa ${ri + 1} câu ${q.index + 1}`} value={Number.isFinite(rubric.maxScore) ? rubric.maxScore : null} onChange={(v) => editRubric(q.index, ri, { maxScore: v })} disabled={saving} /></label>
                        <Button danger icon={<DeleteOutlined />} aria-label={`Bỏ tiêu chí ${ri + 1} câu ${q.index + 1}`} disabled={saving} onClick={() => editQuestion(q.index, { rubrics: q.rubrics.filter((_, i) => i !== ri) })} />
                    </div>)}<Button icon={<PlusOutlined />} disabled={saving} onClick={() => editQuestion(q.index, { rubrics: [...q.rubrics, { criteria: '', weight: 0, maxScore: 0 }] })}>Thêm tiêu chí</Button></div> }} />
                    <div className="import-footer"><span>{questions.length} câu hỏi · {courses.find((c) => c.id === courseId)?.code ?? 'Chưa chọn môn học'}</span><Button type="primary" size="large" loading={saving} disabled={!courseId || errors.length > 0 || reading || coursesLoading || !!courseError} onClick={save}>Lưu {questions.length} câu hỏi vào ngân hàng</Button></div>
                </Card>}
            </>}
        </div>
    );
}
