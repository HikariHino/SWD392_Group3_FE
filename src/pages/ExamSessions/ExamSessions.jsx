import React, { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, DatePicker, Empty, Form, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { examApi } from '../../services/examApi';
import { questionApi } from '../../services/questionApi';
import { parseApiError } from '../../utils/apiError';
import '../../styles/WorkspacePages.css';

const STATUS_TAGS = {
    Draft: { color: 'default', label: 'Nháp' },
    Open: { color: 'green', label: 'Đang mở' },
    Closed: { color: 'blue', label: 'Đã đóng' },
    Cancelled: { color: 'red', label: 'Đã huỷ' },
};

const RUBRIC_HINT = 'Môn học cần có Rubric tổng đúng 100% và câu hỏi phải có điểm dương.';

const studentLink = (sessionId) => `${window.location.origin}/exam-room/${sessionId}`;
const formatDateTime = (value) => new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

const validateWindow = async (_, value) => {
    if (value?.[1] && !value[1].isAfter(new Date())) throw new Error('Giờ kết thúc phải ở tương lai.');
};

const toSubmitError = (error) => {
    const { message, fieldErrors } = parseApiError(error, 'Chưa tạo được ca thi.');
    const details = fieldErrors.map((field) => field.error);
    return { message, details: details.some((detail) => detail.includes('rubrics')) ? [RUBRIC_HINT] : details };
};

export default function ExamSessions() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [courses, setCourses] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [attempts, setAttempts] = useState({});
    const [loadingAttempts, setLoadingAttempts] = useState({});

    const courseId = Form.useWatch('courseId', form);

    const reloadSessions = useCallback(async () => {
        setLoadingSessions(true);
        try {
            const { data } = await examApi.listSessions();
            setSessions(data);
        } catch (error) {
            message.error(parseApiError(error, 'Không tải được danh sách ca thi.').message);
        } finally { setLoadingSessions(false); }
    }, [message]);

    useEffect(() => {
        reloadSessions();
    }, [reloadSessions]);

    useEffect(() => {
        questionApi.getCourses()
            .then(({ data }) => setCourses(data))
            .catch((error) => message.error(parseApiError(error, 'Không tải được danh sách môn học.').message));
    }, [message]);

    useEffect(() => {
        form.setFieldValue('questionIds', []);
        setQuestions([]);
        if (!courseId) return undefined;
        let ignore = false;
        setLoadingQuestions(true);
        questionApi.getQuestions({ courseId, pageSize: 100 })
            .then(({ data }) => !ignore && setQuestions(data.items))
            .catch((error) => !ignore && message.error(parseApiError(error, 'Không tải được câu hỏi của môn này.').message))
            .finally(() => !ignore && setLoadingQuestions(false));
        return () => {
            ignore = true;
        };
    }, [courseId, form, message]);

    const handleCreate = async (values) => {
        const [start, end] = values.window;
        setSubmitting(true);
        setSubmitError(null);
        try {
            const { data } = await examApi.createSession({
                courseId: values.courseId,
                sessionTitle: values.sessionTitle.trim(),
                startTime: start.toDate().toISOString(),
                endTime: end.toDate().toISOString(),
                questionIds: values.questionIds,
            });
            setSessions((current) => [data, ...current]);
            form.resetFields();
            message.success('Đã tạo ca thi. Bấm Mở ca để sinh viên vào được phòng.');
        } catch (error) {
            setSubmitError(toSubmitError(error));
        } finally {
            setSubmitting(false);
        }
    };

    const handleTransition = async (session, action, successText) => {
        setBusyId(session.id);
        try {
            const { data } = await examApi.transitionSession(session.id, action);
            setSessions((current) => current.map((item) => (item.id === data.id ? data : item)));
            message.success(successText);
        } catch (error) {
            const parsed = toSubmitError(error);
            message.error(parsed.details[0] ?? error.response?.data?.detail ?? parsed.message);
            reloadSessions();
        } finally {
            setBusyId(null);
        }
    };

    const loadAttempts = async (sessionId) => {
        if (attempts[sessionId] || loadingAttempts[sessionId]) return;
        setLoadingAttempts((current) => ({ ...current, [sessionId]: true }));
        try {
            const { data } = await examApi.getSessionAttempts(sessionId);
            setAttempts((current) => ({ ...current, [sessionId]: data }));
        } catch (error) {
            message.error(parseApiError(error, 'Không tải được danh sách thí sinh.').message);
        } finally { setLoadingAttempts((current) => ({ ...current, [sessionId]: false })); }
    };

    const columns = [
        {
            title: 'Ca thi',
            dataIndex: 'sessionTitle',
            render: (title, session) => <Space orientation="vertical" size={0}><strong>{title}</strong><span className="muted-text">{courses.find((course) => course.id === session.courseId)?.code} · {session.questionIds.length} câu hỏi</span></Space>,
        },
        {
            title: 'Thời gian',
            width: 270,
            render: (_, session) => <span className="muted-text">{formatDateTime(session.startTime)} → {formatDateTime(session.endTime)}</span>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 110,
            render: (status) => <Tag color={STATUS_TAGS[status]?.color}>{STATUS_TAGS[status]?.label ?? status}</Tag>,
        },
        {
            title: 'Link cho sinh viên',
            render: (_, session) => <Typography.Text copyable={{ text: studentLink(session.id) }} className="muted-text">{session.id.slice(0, 8).toUpperCase()}</Typography.Text>,
        },
        {
            title: 'Thao tác',
            width: 200,
            render: (_, session) => (
                <Space wrap>
                    {session.status === 'Draft' && <Button type="primary" size="small" loading={busyId === session.id} onClick={() => handleTransition(session, 'open', 'Đã mở ca thi. Gửi link cho sinh viên.')}>Mở ca</Button>}
                    {session.status === 'Open' && (
                        <Popconfirm title="Đóng ca thi?" description="Các bài đang làm sẽ được tự động nộp." okText="Đóng ca" cancelText="Huỷ" onConfirm={() => handleTransition(session, 'close', 'Đã đóng ca thi.')}>
                            <Button size="small" loading={busyId === session.id}>Đóng ca</Button>
                        </Popconfirm>
                    )}
                    {(session.status === 'Draft' || session.status === 'Open') && (
                        <Popconfirm title="Huỷ ca thi?" description="Sinh viên sẽ không tiếp tục làm bài được." okText="Huỷ ca" cancelText="Không" okButtonProps={{ danger: true }} onConfirm={() => handleTransition(session, 'cancel', 'Đã huỷ ca thi.')}>
                            <Button danger size="small" disabled={busyId === session.id}>Huỷ ca</Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="workspace-page">
            <div className="workspace-heading">
                <div>
                    <span className="page-kicker">AIVES · CA THI VẤN ĐÁP</span>
                    <h1>Tổ chức ca thi vấn đáp</h1>
                    <p>Chọn câu hỏi, đặt thời gian, mở ca rồi gửi link cho sinh viên vào phòng thi.</p>
                </div>
            </div>

            <Card title="Tạo ca thi mới">
                {submitError && (
                    <Alert type="error" showIcon className="validation-errors" title={submitError.message}
                        description={submitError.details.length > 0 && <ul>{submitError.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>} />
                )}
                <Form form={form} layout="vertical" onFinish={handleCreate} disabled={submitting}>
                    <div className="workspace-two-columns">
                        <Form.Item name="courseId" label="Môn học" rules={[{ required: true, message: 'Vui lòng chọn môn học.' }]} extra={RUBRIC_HINT}>
                            <Select placeholder="Chọn môn học" showSearch={{ optionFilterProp: 'label' }}
                                options={courses.map((course) => ({ value: course.id, label: `${course.code} - ${course.name}` }))} />
                        </Form.Item>
                        <Form.Item name="sessionTitle" label="Tên ca thi"
                            rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên ca thi.' }, { max: 200, message: 'Tối đa 200 ký tự.' }]}>
                            <Input placeholder="VD: Vấn đáp SWD392 - Nhóm 3" />
                        </Form.Item>
                    </div>
                    <Form.Item name="questionIds" label="Câu hỏi (thứ tự chọn là thứ tự hỏi)" rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 câu hỏi.' }]}>
                        <Select mode="multiple" loading={loadingQuestions} disabled={!courseId}
                            placeholder={courseId ? 'Chọn câu hỏi' : 'Chọn môn học trước'}
                            notFoundContent={loadingQuestions ? 'Đang tải...' : 'Môn này chưa có câu hỏi'}
                            showSearch={{ optionFilterProp: 'label' }}
                            options={questions.map((question) => ({ value: question.id, label: question.content }))} />
                    </Form.Item>
                    <Form.Item name="window" label="Thời gian mở ca" rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu và kết thúc.' }, { validator: validateWindow }]}>
                        <DatePicker.RangePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" className="full-width" placeholder={['Bắt đầu', 'Kết thúc']} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={submitting}>Tạo ca thi</Button>
                </Form>
            </Card>

            <Card title="Ca thi do bạn tạo" extra={<Button icon={<ReloadOutlined />} onClick={reloadSessions} loading={loadingSessions}>Tải lại</Button>}>
                <Table rowKey="id" columns={columns} dataSource={sessions} loading={loadingSessions} pagination={false} scroll={{ x: 820 }}
                    expandable={{ onExpand: (expanded, row) => expanded && loadAttempts(row.id), expandedRowRender: (session) => <Table size="small" rowKey="id" loading={loadingAttempts[session.id]} pagination={false} dataSource={attempts[session.id] || []} columns={[
                        { title: 'Sinh viên', render: (_, item) => <Space orientation="vertical" size={0}><strong>{item.fullName}</strong><span className="muted-text">{item.username}</span></Space> },
                        { title: 'Trạng thái bài', dataIndex: 'status', render: (status) => <Tag>{status}</Tag> },
                        { title: 'Nộp lúc', dataIndex: 'submittedAt', render: (value) => value ? formatDateTime(value) : 'Chưa nộp' },
                        { title: 'Điểm', dataIndex: 'totalScore', render: (value) => value ?? 'Chưa chốt' },
                        { title: 'Thao tác', render: (_, item) => <Button size="small" disabled={item.status === 'InProgress'} onClick={() => navigate(`/grading?attemptId=${item.id}`)}>Xem/chấm bài</Button> },
                    ]} locale={{ emptyText: 'Chưa có sinh viên bắt đầu bài thi.' }} /> }}
                    locale={{ emptyText: <Empty description="Chưa có ca thi nào. Hãy tạo ca đầu tiên ở trên." /> }} />
            </Card>
        </div>
    );
}
