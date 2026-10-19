import React, { useEffect, useRef, useState } from 'react';
import { Alert, Form, Input, Modal, Select } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { questionApi } from '../../../services/questionApi';
import { BLOOM_LEVEL_OPTIONS } from '../../../utils/bloomLevel';
import { parseApiError } from '../../../utils/apiError';

export default function GenerateQuestionModal({ courses, defaultCourseId, defaultBloomLevel, onCancel, onGenerated }) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);
    const request = useRef(null);

    useEffect(() => () => request.current?.abort(), []);

    const handleSubmit = async () => {
        if (request.current) return;
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }
        if (request.current) return;
        const controller = new AbortController();
        request.current = controller;
        setSubmitting(true);
        setServerError(null);
        try {
            const { data } = await questionApi.generateQuestionWithAi({
                courseId: values.courseId,
                topic: values.topic.trim(),
                bloomLevel: values.bloomLevel,
            }, { signal: controller.signal });
            if (controller.signal.aborted) return;
            if (typeof data?.content !== 'string' || !data.content.trim() ||
                !Array.isArray(data.rubrics) || !data.rubrics.length ||
                data.rubrics.some((rubric) => !rubric || typeof rubric.criteria !== 'string')) {
                setServerError('Máy chủ trả về bản nháp không hợp lệ. Vui lòng thử sinh lại câu hỏi.');
                return;
            }
            onGenerated({
                courseId: values.courseId,
                bloomLevel: values.bloomLevel,
                content: data.content,
                rubrics: data.rubrics.map(({ criteria, weight, maxScore }) => ({ criteria, weight, maxScore })),
            });
        } catch (error) {
            if (controller.signal.aborted) return;
            const parsed = parseApiError(error, 'Không sinh được câu hỏi. Vui lòng thử lại.');
            setServerError(error.code === 'ECONNABORTED'
                ? 'Sinh câu hỏi mất quá nhiều thời gian. Vui lòng thử lại.'
                : parsed.message);
            form.setFields(parsed.fieldErrors.filter((field) => field.name.length > 0)
                .map((field) => ({ name: field.name, errors: [field.error] })));
        } finally {
            if (!controller.signal.aborted) {
                request.current = null;
                setSubmitting(false);
            }
        }
    };

    return (
        <Modal open title={<><RobotOutlined /> Sinh bằng AI Gemini</>}
            okText="Sinh câu hỏi" cancelText="Huỷ" onOk={handleSubmit} onCancel={onCancel}
            confirmLoading={submitting} okButtonProps={{ disabled: courses.length === 0 }}
            cancelButtonProps={{ disabled: submitting }} closable={!submitting}
            keyboard={!submitting} mask={{ closable: false }}>
            <Alert type="info" showIcon style={{ marginBottom: 16 }}
                title="Sinh câu hỏi vấn đáp kèm Rubric"
                description="Chọn môn học, nhập chủ đề và mức Bloom. Bạn sẽ được xem, chỉnh sửa bản nháp trước khi lưu." />
            {courses.length === 0 && <Alert type="warning" showIcon style={{ marginBottom: 16 }}
                title="Chưa có môn học. Hãy kiểm tra danh sách môn học trước khi sinh câu hỏi." />}
            {serverError && <Alert type="error" showIcon title={serverError} style={{ marginBottom: 16 }} />}
            <Form form={form} name="ai-question" layout="vertical" disabled={submitting}
                initialValues={{ courseId: defaultCourseId, bloomLevel: defaultBloomLevel }}>
                <Form.Item name="courseId" label="Môn học"
                    rules={[{ required: true, message: 'Vui lòng chọn môn học.' }]}>
                    <Select placeholder="Chọn môn học" showSearch={{ optionFilterProp: 'label' }}
                        options={courses.map((course) => ({ value: course.id, label: `${course.code} - ${course.name}` }))} />
                </Form.Item>
                <Form.Item name="topic" label="Chủ đề câu hỏi"
                    rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập chủ đề câu hỏi.' }]}>
                    <Input.TextArea rows={4} placeholder="Ví dụ: Dependency Injection trong kiến trúc Onion" />
                </Form.Item>
                <Form.Item name="bloomLevel" label="Mức độ Bloom"
                    rules={[{ required: true, message: 'Vui lòng chọn mức độ Bloom.' }]}>
                    <Select options={BLOOM_LEVEL_OPTIONS} />
                </Form.Item>
            </Form>
            {submitting && <p role="status">Đang sinh câu hỏi và Rubric, vui lòng chờ…</p>}
        </Modal>
    );
}
