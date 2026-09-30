import React, { useEffect, useState } from 'react';
import {
    Alert,
    App,
    Button,
    Col,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { questionApi } from '../../../services/questionApi';
import { BLOOM_LEVEL_OPTIONS } from '../../../utils/bloomLevel';
import { parseApiError } from '../../../utils/apiError';

const { Text } = Typography;

const EMPTY_RUBRIC = { criteria: '', weight: null, maxScore: 10 };
const INITIAL_VALUES = {
    courseId: undefined,
    bloomLevel: 2,
    content: '',
    rubrics: [{ criteria: '', weight: 100, maxScore: 10 }],
};

const sumWeight = (rubrics = []) =>
    Math.round(rubrics.reduce((sum, r) => sum + (Number(r?.weight) || 0), 0) * 100) / 100;

// Validation phía Client: khớp với FluentValidation ở Backend (QuestionValidators.cs)
const rubricListRules = [
    {
        validator: async (_, rubrics) => {
            if (!rubrics || rubrics.length === 0) {
                throw new Error('Câu hỏi phải có ít nhất 1 tiêu chí Rubric đánh giá.');
            }
            const total = sumWeight(rubrics);
            if (Math.abs(total - 100) >= 0.01) {
                throw new Error(`Tổng trọng số của các tiêu chí phải bằng đúng 100% (hiện tại: ${total}%).`);
            }
        },
    },
];

const notBlank = (label) => ({
    validator: async (_, value) => {
        if (!value || !value.trim()) throw new Error(`${label} không được để trống.`);
    },
});

/**
 * Modal Thêm / Sửa câu hỏi.
 * - questionId = null  -> chế độ Thêm mới (POST /api/questions)
 * - questionId = <id>  -> chế độ Sửa    (GET + PUT /api/questions/{id})
 */
export default function QuestionFormModal({ open, questionId, courses, defaultCourseId, onCancel, onSaved }) {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);

    const isEdit = Boolean(questionId);
    const rubrics = Form.useWatch('rubrics', form) || [];
    const totalWeight = sumWeight(rubrics);

    useEffect(() => {
        if (!open) return;

        setServerError(null);
        form.resetFields();

        if (!isEdit) {
            form.setFieldsValue({ courseId: defaultCourseId });
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
                    rubrics: data.rubrics.map(({ criteria, weight, maxScore }) => ({ criteria, weight, maxScore })),
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

    const handleValuesChange = (changed) => {
        // Khi đã báo lỗi tổng trọng số, kiểm tra lại ngay mỗi khi người dùng sửa Rubric
        if ('rubrics' in changed && form.getFieldError(['rubrics']).length > 0) {
            form.validateFields([['rubrics']]).catch(() => {});
        }
    };

    const distributeWeights = () => {
        const current = form.getFieldValue('rubrics') || [];
        if (current.length === 0) return;
        const base = Math.floor((100 / current.length) * 100) / 100;
        const last = Math.round((100 - base * (current.length - 1)) * 100) / 100;
        form.setFieldValue(
            'rubrics',
            current.map((r, i) => ({ ...r, weight: i === current.length - 1 ? last : base })),
        );
        form.validateFields([['rubrics']]).catch(() => {});
    };

    const handleSubmit = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return; // Lỗi validation đã hiển thị trên form
        }

        const payload = {
            content: values.content.trim(),
            bloomLevel: values.bloomLevel,
            rubrics: values.rubrics.map((r) => ({
                criteria: r.criteria.trim(),
                weight: r.weight,
                maxScore: r.maxScore,
            })),
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
            title={isEdit ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
            width={820}
            okText={isEdit ? 'Lưu thay đổi' : 'Tạo câu hỏi'}
            cancelText="Huỷ"
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={submitting}
            okButtonProps={{ disabled: loading }}
            mask={{ closable: false }}
            forceRender
        >
            <Spin spinning={loading}>
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
                    onValuesChange={handleValuesChange}
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

                    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong>Tiêu chí chấm điểm (Rubric)</Text>
                        <Space>
                            <Text type="secondary">Tổng trọng số:</Text>
                            <Tag color={Math.abs(totalWeight - 100) < 0.01 ? 'success' : 'error'}>
                                {totalWeight}% / 100%
                            </Tag>
                            <Tooltip title="Chia đều 100% cho tất cả tiêu chí">
                                <Button size="small" onClick={distributeWeights} disabled={rubrics.length === 0}>
                                    Chia đều
                                </Button>
                            </Tooltip>
                        </Space>
                    </Space>

                    <Form.List name="rubrics" rules={rubricListRules}>
                        {(fields, { add, remove }, { errors }) => (
                            <>
                                {fields.length > 0 && (
                                    <Row gutter={8} style={{ marginBottom: 4 }}>
                                        <Col flex="auto">
                                            <Text type="secondary">Tên tiêu chí</Text>
                                        </Col>
                                        <Col flex="130px">
                                            <Text type="secondary">Trọng số (%)</Text>
                                        </Col>
                                        <Col flex="130px">
                                            <Text type="secondary">Điểm tối đa</Text>
                                        </Col>
                                        <Col flex="32px" />
                                    </Row>
                                )}

                                {fields.map(({ key, name }) => (
                                    <Row key={key} gutter={8} align="top">
                                        <Col flex="auto">
                                            <Form.Item
                                                name={[name, 'criteria']}
                                                rules={[
                                                    { required: true, message: 'Tiêu chí không được để trống.' },
                                                    notBlank('Tiêu chí'),
                                                    { max: 500, message: 'Tối đa 500 ký tự.' },
                                                ]}
                                            >
                                                <Input placeholder="VD: Giải thích đúng khái niệm" />
                                            </Form.Item>
                                        </Col>
                                        <Col flex="130px">
                                            <Form.Item
                                                name={[name, 'weight']}
                                                rules={[
                                                    { required: true, message: 'Nhập trọng số.' },
                                                    { type: 'number', min: 0.01, max: 100, message: 'Từ 0.01 đến 100.' },
                                                ]}
                                            >
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    precision={2}
                                                    suffix="%"
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col flex="130px">
                                            <Form.Item
                                                name={[name, 'maxScore']}
                                                rules={[
                                                    { required: true, message: 'Nhập điểm tối đa.' },
                                                    { type: 'number', min: 0.01, max: 100, message: 'Từ 0.01 đến 100.' },
                                                ]}
                                            >
                                                <InputNumber style={{ width: '100%' }} min={0} max={100} step={1} />
                                            </Form.Item>
                                        </Col>
                                        <Col flex="32px">
                                            <Tooltip title="Xoá tiêu chí">
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => remove(name)}
                                                    aria-label="Xoá tiêu chí"
                                                />
                                            </Tooltip>
                                        </Col>
                                    </Row>
                                ))}

                                <Form.Item style={{ marginBottom: 0 }}>
                                    <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add(EMPTY_RUBRIC)}>
                                        Thêm tiêu chí
                                    </Button>
                                    <Form.ErrorList errors={errors} />
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Spin>
        </Modal>
    );
}
