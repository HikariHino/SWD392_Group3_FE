import React, { useEffect, useState } from 'react';
import {
    Alert,
    App,
    Button,
    Card,
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
    Typography,
} from 'antd';
import {
    BulbOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    PlusOutlined,
    ReloadOutlined,
    RobotOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { questionApi } from '../../../services/questionApi';
import { BLOOM_LEVEL_OPTIONS } from '../../../utils/bloomLevel';
import { parseApiError } from '../../../utils/apiError';

const { Text, Paragraph } = Typography;

const sumWeight = (rubrics = []) =>
    Math.round(rubrics.reduce((sum, r) => sum + (Number(r?.weight) || 0), 0) * 100) / 100;

export default function AiGenerateModal({ open, courses, defaultCourseId, onCancel, onSaved }) {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generatedData, setGeneratedData] = useState(null);
    const [serverError, setServerError] = useState(null);

    const rubrics = Form.useWatch('rubrics', form) || [];
    const totalWeight = sumWeight(rubrics);

    useEffect(() => {
        if (!open) {
            setGeneratedData(null);
            setServerError(null);
            form.resetFields();
            return;
        }

        form.setFieldsValue({
            courseId: defaultCourseId || (courses.length > 0 ? courses[0].id : undefined),
            bloomLevel: 4, // Default Analyze
            topic: '',
            content: '',
            rubrics: [],
        });
    }, [open, defaultCourseId, courses, form]);

    const handleGenerateAi = async () => {
        try {
            const values = await form.validateFields(['courseId', 'bloomLevel', 'topic']);
            setGenerating(true);
            setServerError(null);

            const { data } = await questionApi.generateQuestionWithAi({
                courseId: values.courseId,
                bloomLevel: values.bloomLevel,
                topic: values.topic.trim(),
            });

            setGeneratedData(data);
            form.setFieldsValue({
                content: data.content,
                rubrics: data.rubrics?.map((r) => ({
                    criteria: r.criteria,
                    weight: r.weight,
                    maxScore: r.maxScore ?? 10,
                })) || [],
            });

            message.success('AI Gemini đã sinh câu hỏi và ma trận Rubric thành công!');
        } catch (error) {
            if (error?.errorFields) return; // Client validation failed
            const { message: errMsg } = parseApiError(error, 'Không thể sinh câu hỏi bằng AI.');
            setServerError(errMsg);
            message.error(errMsg);
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveToBank = async () => {
        try {
            const values = await form.validateFields(['courseId', 'bloomLevel', 'content', 'rubrics']);
            const currentTotal = sumWeight(values.rubrics);
            if (Math.abs(currentTotal - 100) >= 0.01) {
                message.error(`Tổng trọng số Rubric hiện là ${currentTotal}%, bắt buộc phải bằng đúng 100% để lưu.`);
                return;
            }

            setSaving(true);
            setServerError(null);

            const payload = {
                courseId: values.courseId,
                bloomLevel: values.bloomLevel,
                content: values.content.trim(),
                rubrics: values.rubrics.map((r) => ({
                    criteria: r.criteria.trim(),
                    weight: Number(r.weight),
                    maxScore: Number(r.maxScore) || 10,
                })),
            };

            await questionApi.createQuestion(payload);
            message.success('Đã lưu câu hỏi do AI sinh vào Ngân hàng Đề thi!');
            onSaved();
        } catch (error) {
            if (error?.errorFields) return;
            const { message: errMsg } = parseApiError(error, 'Lưu câu hỏi thất bại.');
            setServerError(errMsg);
            message.error(errMsg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            title={
                <Space>
                    <RobotOutlined style={{ color: '#7b43b6', fontSize: 20 }} />
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Sinh câu hỏi vấn đáp bằng AI (Google Gemini)</span>
                </Space>
            }
            width={860}
            footer={null}
            onCancel={onCancel}
            mask={{ closable: false }}
            destroyOnClose
        >
            <Spin spinning={generating} tip="AI Gemini đang phân tích chủ đề và soạn ma trận Rubric chuẩn hóa 100%...">
                {serverError && (
                    <Alert
                        type="error"
                        showIcon
                        title="Lỗi xử lý"
                        description={serverError}
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Form form={form} layout="vertical">
                    {/* Hàng 1: Chọn môn học & Mức độ Bloom */}
                    <Row gutter={16}>
                        <Col span={14}>
                            <Form.Item
                                name="courseId"
                                label="Môn học áp dụng"
                                rules={[{ required: true, message: 'Vui lòng chọn môn học.' }]}
                            >
                                <Select
                                    placeholder="Chọn môn học..."
                                    options={courses.map((c) => ({
                                        value: c.id,
                                        label: `${c.code} - ${c.name}`,
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={10}>
                            <Form.Item
                                name="bloomLevel"
                                label="Thang đo nhận thức Bloom"
                                rules={[{ required: true, message: 'Vui lòng chọn mức độ Bloom.' }]}
                            >
                                <Select options={BLOOM_LEVEL_OPTIONS} />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Hàng 2: Chủ đề yêu cầu AI sinh */}
                    <Form.Item
                        name="topic"
                        label="Chủ đề / Yêu cầu kiến thức cần AI sinh"
                        rules={[
                            { required: true, message: 'Vui lòng nhập chủ đề câu hỏi.' },
                            { min: 5, message: 'Chủ đề nên có ít nhất 5 ký tự để AI sinh sát thực tế.' },
                        ]}
                    >
                        <Input.TextArea
                            rows={2}
                            placeholder="VD: Nguyên lý Dependency Injection và Service Lifetimes (Transient, Scoped, Singleton) trong ASP.NET Core..."
                        />
                    </Form.Item>

                    {/* Nút bấm Kích hoạt AI */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            onClick={handleGenerateAi}
                            loading={generating}
                            style={{
                                background: 'linear-gradient(135deg, #7b43b6 0%, #1c58ce 100%)',
                                borderColor: '#7b43b6',
                                fontWeight: 600,
                            }}
                        >
                            {generatedData ? 'Sinh lại bằng AI Gemini' : 'Bắt đầu Sinh bằng AI Gemini'}
                        </Button>
                    </div>

                    {/* Kết quả sau khi AI sinh */}
                    {generatedData && (
                        <Card
                            style={{
                                background: '#fafbfc',
                                borderColor: '#d3adf7',
                                marginBottom: 20,
                            }}
                            title={
                                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <Space>
                                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                        <span style={{ fontWeight: 600 }}>Kết quả Bản thảo do AI đề xuất</span>
                                    </Space>
                                    <Space>
                                        <Tag color="purple">Độ tin cậy: {generatedData.aiConfidence || 96}%</Tag>
                                        <Tag color="blue">{generatedData.sourceContext || 'Gemini 2.5 Flash'}</Tag>
                                    </Space>
                                </Space>
                            }
                        >
                            <Form.Item
                                name="content"
                                label="Nội dung câu hỏi vấn đáp (Có thể chỉnh sửa trước khi lưu)"
                                rules={[{ required: true, message: 'Nội dung câu hỏi không được để trống.' }]}
                            >
                                <Input.TextArea rows={3} style={{ fontWeight: 500 }} />
                            </Form.Item>

                            <div style={{ marginBottom: 12 }}>
                                <Space orientation="horizontal" style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                                        Ma trận Tiêu chí Rubric Chấm điểm
                                    </span>
                                    <Tag color={Math.abs(totalWeight - 100) < 0.01 ? 'success' : 'error'}>
                                        Tổng trọng số: {totalWeight}% / 100%
                                    </Tag>
                                </Space>
                            </div>

                            <Form.List name="rubrics">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }, index) => (
                                            <Row
                                                key={key}
                                                gutter={12}
                                                align="middle"
                                                style={{
                                                    marginBottom: 8,
                                                    padding: '8px 12px',
                                                    background: '#fff',
                                                    borderRadius: 6,
                                                    border: '1px solid #e8ecf2',
                                                }}
                                            >
                                                <Col span={14}>
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'criteria']}
                                                        noStyle
                                                        rules={[{ required: true, message: 'Nhập tiêu chí' }]}
                                                    >
                                                        <Input placeholder={`Tiêu chí ${index + 1}...`} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={4}>
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'weight']}
                                                        noStyle
                                                        rules={[{ required: true, message: 'Trọng số' }]}
                                                    >
                                                        <InputNumber
                                                            min={1}
                                                            max={100}
                                                            addonAfter="%"
                                                            placeholder="Trọng số"
                                                            style={{ width: '100%' }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={4}>
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'maxScore']}
                                                        noStyle
                                                        rules={[{ required: true, message: 'Điểm tối đa' }]}
                                                    >
                                                        <InputNumber
                                                            min={1}
                                                            max={100}
                                                            addonAfter="đ"
                                                            placeholder="Điểm"
                                                            style={{ width: '100%' }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={2} style={{ textAlign: 'center' }}>
                                                    {fields.length > 1 && (
                                                        <Button
                                                            type="text"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => remove(name)}
                                                        />
                                                    )}
                                                </Col>
                                            </Row>
                                        ))}

                                        <Button
                                            type="dashed"
                                            onClick={() => add({ criteria: '', weight: 0, maxScore: 10 })}
                                            block
                                            icon={<PlusOutlined />}
                                            style={{ marginTop: 8 }}
                                        >
                                            Thêm tiêu chí Rubric
                                        </Button>
                                    </>
                                )}
                            </Form.List>

                            {/* Nút hành động Lưu hoặc Hủy */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: 10,
                                    marginTop: 20,
                                    paddingTop: 16,
                                    borderTop: '1px solid #f0f0f0',
                                }}
                            >
                                <Button onClick={onCancel}>Đóng</Button>
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    onClick={handleSaveToBank}
                                    loading={saving}
                                    disabled={Math.abs(totalWeight - 100) >= 0.01}
                                >
                                    Lưu vào Ngân hàng Đề thi
                                </Button>
                            </div>
                        </Card>
                    )}
                </Form>
            </Spin>
        </Modal>
    );
}
