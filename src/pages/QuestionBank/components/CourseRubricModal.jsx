import React, { useEffect, useState } from 'react';
import { Alert, App, Button, Form, Input, InputNumber, Modal, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { questionApi } from '../../../services/questionApi';
import { parseApiError } from '../../../utils/apiError';

export default function CourseRubricModal({ course, onCancel, onSaved }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (course) form.setFieldsValue({ rubrics: course.rubrics?.map(({ criteria, weight, maxScore }) => ({ criteria, weight, maxScore })) ?? [] });
  }, [course, form]);
  const save = async () => {
    const values = await form.validateFields();
    const total = values.rubrics.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    if (Math.abs(total - 100) > 0.001) return message.error('Tổng trọng số rubric phải bằng 100%.');
    setSaving(true);
    try { await questionApi.replaceCourseRubrics(course.id, values.rubrics); message.success('Đã lưu rubric môn học.'); onSaved(); }
    catch (error) { message.error(parseApiError(error, 'Không thể lưu rubric.').message); }
    finally { setSaving(false); }
  };
  return <Modal open={Boolean(course)} title={`Cấu hình rubric · ${course?.code ?? ''}`} onCancel={onCancel} onOk={save} okText="Lưu rubric" confirmLoading={saving} width={760}>
    <Alert type="info" showIcon style={{ marginBottom: 16 }} description="Rubric được dùng chung cho toàn bộ câu hỏi thuộc môn học này; tổng trọng số phải đúng 100%." />
    <Form form={form} layout="vertical"><Form.List name="rubrics">{(fields, { add, remove }) => <>
      {fields.map((field, index) => <Space key={field.key} align="start" style={{ display: 'flex' }}>
        <Form.Item {...field} name={[field.name, 'criteria']} label={index === 0 ? 'Tiêu chí' : undefined} rules={[{ required: true, message: 'Nhập tiêu chí.' }]}><Input style={{ width: 360 }} /></Form.Item>
        <Form.Item {...field} name={[field.name, 'weight']} label={index === 0 ? 'Trọng số (%)' : undefined} rules={[{ required: true }]}><InputNumber min={0.01} max={100} style={{ width: 120 }} /></Form.Item>
        <Form.Item {...field} name={[field.name, 'maxScore']} label={index === 0 ? 'Điểm tối đa' : undefined} rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: 120 }} /></Form.Item>
        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="Xóa tiêu chí" />
      </Space>)}
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ criteria: '', weight: 0, maxScore: 0 })}>Thêm tiêu chí</Button>
    </>}</Form.List></Form>
  </Modal>;
}
