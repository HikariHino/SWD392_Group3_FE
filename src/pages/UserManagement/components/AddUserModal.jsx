import React, { useState } from 'react';
import { Alert, App, Form, Input, Modal, Select } from 'antd';
import { IdcardOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { authApi, ROLE_LABELS, ROLES } from '../../../services/authApi';
import { parseApiError } from '../../../utils/apiError';

// Giới hạn khớp với CreateUserDtoValidator.cs ở Backend
const MAX_PASSWORD_BYTES = 72;
const byteLength = (value) => new TextEncoder().encode(value).length;

export default function AddUserModal({ open, onCancel, onSaved }) {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);

    const handleCancel = () => {
        form.resetFields();
        setServerError(null);
        onCancel();
    };

    const handleSubmit = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return; // Lỗi validation đã hiển thị trên form
        }

        setSubmitting(true);
        setServerError(null);
        try {
            await authApi.register({
                username: values.username.trim(),
                password: values.password,
                fullName: values.fullName.trim(),
                role: values.role,
            });
            message.success(`Đã tạo tài khoản ${values.username.trim()}.`);
            form.resetFields();
            onSaved();
        } catch (error) {
            // 409 = trùng tên đăng nhập
            if (error.response?.status === 409) {
                form.setFields([{ name: 'username', errors: ['Tên đăng nhập này đã có người dùng.'] }]);
                setServerError('Tên đăng nhập này đã có người dùng, hãy chọn tên khác.');
            } else {
                const { message: errorMessage, fieldErrors } = parseApiError(error, 'Tạo tài khoản thất bại.');
                setServerError(errorMessage);
                form.setFields(
                    fieldErrors.filter((f) => f.name.length > 0).map((f) => ({ name: f.name, errors: [f.error] })),
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            title="Thêm người dùng"
            okText="Tạo tài khoản"
            cancelText="Huỷ"
            onOk={handleSubmit}
            onCancel={handleCancel}
            confirmLoading={submitting}
            mask={{ closable: false }}
            forceRender
        >
            {serverError && <Alert type="error" showIcon style={{ marginBottom: 16 }} title={serverError} />}

            <Form
                form={form}
                layout="vertical"
                initialValues={{ role: ROLES.STUDENT }}
                disabled={submitting}
            >
                <Form.Item
                    name="fullName"
                    label="Họ và tên"
                    rules={[
                        { required: true, message: 'Vui lòng nhập họ và tên.' },
                        { max: 100, message: 'Họ và tên không được vượt quá 100 ký tự.' },
                    ]}
                >
                    <Input prefix={<IdcardOutlined />} placeholder="VD: Nguyễn Văn An" />
                </Form.Item>

                <Form.Item
                    name="username"
                    label="Tên đăng nhập"
                    rules={[
                        { required: true, message: 'Vui lòng nhập tên đăng nhập.' },
                        { min: 3, message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' },
                        { max: 50, message: 'Tên đăng nhập không được vượt quá 50 ký tự.' },
                    ]}
                >
                    <Input prefix={<UserOutlined />} placeholder="VD: student01" autoComplete="off" />
                </Form.Item>

                <Form.Item
                    name="password"
                    label="Mật khẩu"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu.' },
                        { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự.' },
                        {
                            validator: async (_, value) => {
                                if (value && byteLength(value) > MAX_PASSWORD_BYTES) {
                                    throw new Error('Mật khẩu quá dài, hãy rút ngắn lại.');
                                }
                            },
                        },
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="Ít nhất 6 ký tự" autoComplete="new-password" />
                </Form.Item>

                <Form.Item
                    name="role"
                    label="Vai trò"
                    rules={[{ required: true, message: 'Vui lòng chọn vai trò.' }]}
                >
                    <Select
                        options={Object.values(ROLES).map((role) => ({
                            value: role,
                            label: ROLE_LABELS[role],
                        }))}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
