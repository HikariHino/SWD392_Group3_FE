import React, { useEffect, useState } from 'react';
import {
    Alert,
    App,
    Col,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Spin,
} from 'antd';
import { questionApi } from '../../../services/questionApi';
import { BLOOM_LEVEL_OPTIONS } from '../../../utils/bloomLevel';
import { parseApiError } from '../../../utils/apiError';

const INITIAL_VALUES = {
    courseId: undefined,
    bloomLevel: 2,
    content: '',
};

const notBlank = (label) => ({
    validator: async (_, value) => {
        if (!value || !value.trim()) throw new Error(`${label} không được để trống.`);
    },
});

/**
 * Modal Thêm / Sửa câu hỏi. Rubric nay thuộc về môn học nên không nhập ở đây.
 * - questionId = null  -> chế độ Thêm mới (POST /api/questions)
 * - questionId = <id>  -> chế độ Sửa    (GET + PUT /api/questions/{id})
 */
export default function QuestionFormModal({ open, questionId, initialQuestion, courses, defaultCourseId, onCancel, onSaved }) {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);

    const isEdit = Boolean(questionId);

    useEffect(() => {
        if (!open) return;

        setServerError(null);
        form.resetFields();

        if (!isEdit) {
            form.setFieldsValue(initialQuestion || { courseId: defaultCourseId });
            return;
        }

        let ignore = false;
        setLoading(true);
        questionApi
            .getQuestionById(questionId)
            .then(({ data }) => {
                if (ignore) return;
                form.setFieldsValue({
                    courseId: data.courseId,
                    bloomLevel: data.bloomLevel,
                    content: data.content,
                });
            })
            .catch((error) => {
                if (ignore) return;
                message.error(parseApiError(error, 'Không tải được chi tiết câu hỏi.').message);
                onCancel();
            })
            .finally(() => !ignore && setLoading(false));

        return () => {
            ignore = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, questionId]);

    const handleSubmit = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return; // Lỗi đã hiển thị ngay tại ô nhập
        }

        const payload = {
            content: values.content.trim(),
            bloomLevel: values.bloomLevel,
        };

        setSubmitting(true);
        setServerError(null);
        try {
            if (isEdit) {
                await questionApi.updateQuestion(questionId, payload);
                message.success('Cập nhật câu hỏi thành công!');
            } else {
                await questionApi.createQuestion({ ...payload, courseId: values.courseId });
                message.success('Thêm câu hỏi mới thành công!');
            }
            onSaved();
        } catch (error) {
            const { message: errorMessage, fieldErrors } = parseApiError(error);
            setServerError({ message: errorMessage, details: fieldErrors.map((f) => f.error) });
            form.setFields(
                fieldErrors.filter((f) => f.name.length > 0).map((f) => ({ name: f.name, errors: [f.error] })),
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            title={isEdit ? 'Sửa câu hỏi' : initialQuestion ? 'Xem và chỉnh sửa câu hỏi AI' : 'Thêm câu hỏi mới'}
            width={820}
            okText={isEdit ? 'Lưu thay đổi' : initialQuestion ? 'Lưu vào ngân hàng' : 'Tạo câu hỏi'}
            cancelText="Huỷ"
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={submitting}
            cancelButtonProps={{ disabled: submitting }}
            closable={!submitting}
            keyboard={!submitting}
            okButtonProps={{ disabled: loading }}
            mask={{ closable: false }}
            forceRender
        >
            <Spin spinning={loading}>
                {initialQuestion && !isEdit && (
                    <Alert type="info" showIcon style={{ marginBottom: 16 }}
                        title="Bản nháp chưa được lưu"
                        description="Kiểm tra nội dung trước khi lưu vào ngân hàng câu hỏi."
                    />
                )}
                {serverError && (
                    <Alert
                        type="error"
                        showIcon
                        style={{ marginBottom: 16 }}
                        title={serverError.message}
                        description={
                            serverError.details.length > 0 && (
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {serverError.details.map((d, i) => (
                                        <li key={i}>{d}</li>
                                    ))}
                                </ul>
                            )
                        }
                    />
                )}

                <Form
                    form={form}
                    layout="vertical"
                    initialValues={INITIAL_VALUES}
                    requiredMark
                >
                    <Row gutter={16}>
                        <Col xs={24} md={14}>
                            <Form.Item
                                name="courseId"
                                label="Môn học"
                                rules={[{ required: true, message: 'Vui lòng chọn môn học.' }]}
                                extra={isEdit ? 'Không thể đổi môn học của câu hỏi đã tạo.' : null}
                            >
                                <Select
                                    placeholder="Chọn môn học"
                                    disabled={isEdit}
                                    showSearch={{ optionFilterProp: 'label' }}
                                    options={courses.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={10}>
                            <Form.Item
                                name="bloomLevel"
                                label="Mức độ Bloom"
                                rules={[{ required: true, message: 'Vui lòng chọn mức độ Bloom.' }]}
                            >
                                <Select options={BLOOM_LEVEL_OPTIONS} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="content"
                        label="Nội dung câu hỏi"
                        rules={[
                            { required: true, message: 'Nội dung câu hỏi không được để trống.' },
                            notBlank('Nội dung câu hỏi'),
                            { max: 2000, message: 'Nội dung câu hỏi không được vượt quá 2000 ký tự.' },
                        ]}
                    >
                        <Input.TextArea
                            rows={4}
                            showCount
                            maxLength={2000}
                            placeholder="Ví dụ: Trình bày nguyên lý Dependency Inversion trong Onion Architecture..."
                        />
                    </Form.Item>

                </Form>
            </Spin>
        </Modal>
    );
}
