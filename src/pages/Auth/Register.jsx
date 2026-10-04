import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Form, Input, Select } from 'antd';
import {
    BookOutlined,
    CheckCircleOutlined,
    IdcardOutlined,
    LockOutlined,
    SolutionOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { authApi, HOME_PATH_BY_ROLE, ROLE_LABELS, ROLES } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import { parseApiError } from '../../utils/apiError';
import './Auth.css';

// Giới hạn khớp với CreateUserDtoValidator.cs ở Backend
const MAX_PASSWORD_BYTES = 72;
const byteLength = (value) => new TextEncoder().encode(value).length;

export default function Register() {
    const { message } = App.useApp();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);

    const handleSubmit = async (values) => {
        setSubmitting(true);
        setServerError(null);
        const credentials = { username: values.username.trim(), password: values.password };
        try {
            await authApi.register({
                ...credentials,
                fullName: values.fullName.trim(),
                role: values.role,
            });

            // Đăng ký xong thì đăng nhập luôn cho tiện
            const user = await login(credentials);
            message.success(`Tạo tài khoản thành công. Xin chào ${user.fullName}!`);
            navigate(HOME_PATH_BY_ROLE[user.role] || '/', { replace: true });
        } catch (error) {
            const { message: errorMessage, fieldErrors } = parseApiError(error, 'Đăng ký thất bại.');
            // 409 = trùng tên đăng nhập
            if (error.response?.status === 409) {
                form.setFields([{ name: 'username', errors: ['Tên đăng nhập này đã có người dùng.'] }]);
                setServerError('Tên đăng nhập này đã có người dùng, hãy chọn tên khác.');
            } else {
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
        <div className="auth-page">
            <aside className="auth-aside">
                <div className="auth-brand">
                    <span className="brand-mark"><BookOutlined /></span>
                    <span>
                        <strong>AI Viva Exam</strong>
                        <small>Hệ thống vấn đáp thông minh</small>
                    </span>
                </div>

                <div className="auth-pitch">
                    <h2>Tạo tài khoản để bắt đầu</h2>
                    <p>
                        Giảng viên quản lý ngân hàng câu hỏi và thẩm định điểm. Sinh viên vào phòng thi
                        vấn đáp và xem lại kết quả của mình.
                    </p>
                    <ul className="auth-points">
                        <li><SolutionOutlined /> Giảng viên: soạn câu hỏi, chấm và duyệt điểm</li>
                        <li><TeamOutlined /> Sinh viên: tham gia ca thi vấn đáp với AI</li>
                        <li><CheckCircleOutlined /> Mật khẩu được mã hoá trước khi lưu</li>
                    </ul>
                </div>

                <div className="auth-foot">SWD392 Group 3 © {new Date().getFullYear()}</div>
            </aside>

            <main className="auth-panel">
                <div className="auth-card">
                    <h1>Đăng ký</h1>
                    <p>Điền thông tin bên dưới để tạo tài khoản mới.</p>

                    {serverError && (
                        <Alert type="error" showIcon style={{ marginBottom: 16 }} title={serverError} />
                    )}

                    <Form
                        form={form}
                        className="auth-form"
                        layout="vertical"
                        requiredMark={false}
                        initialValues={{ role: ROLES.STUDENT }}
                        onFinish={handleSubmit}
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
                            <Input size="large" prefix={<IdcardOutlined />} placeholder="VD: Nguyễn Văn An" autoFocus />
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
                            <Input
                                size="large"
                                prefix={<UserOutlined />}
                                placeholder="VD: student01"
                                autoComplete="username"
                            />
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
                            <Input.Password
                                size="large"
                                prefix={<LockOutlined />}
                                placeholder="Ít nhất 6 ký tự"
                                autoComplete="new-password"
                            />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            label="Nhập lại mật khẩu"
                            dependencies={['password']}
                            rules={[
                                { required: true, message: 'Vui lòng nhập lại mật khẩu.' },
                                ({ getFieldValue }) => ({
                                    validator: async (_, value) => {
                                        if (value && value !== getFieldValue('password')) {
                                            throw new Error('Mật khẩu nhập lại không khớp.');
                                        }
                                    },
                                }),
                            ]}
                        >
                            <Input.Password
                                size="large"
                                prefix={<LockOutlined />}
                                placeholder="Nhập lại mật khẩu"
                                autoComplete="new-password"
                            />
                        </Form.Item>

                        <Form.Item
                            name="role"
                            label="Vai trò"
                            rules={[{ required: true, message: 'Vui lòng chọn vai trò.' }]}
                        >
                            <Select
                                size="large"
                                options={Object.values(ROLES).map((role) => ({
                                    value: role,
                                    label: ROLE_LABELS[role],
                                }))}
                            />
                        </Form.Item>

                        <Button
                            className="auth-submit"
                            type="primary"
                            size="large"
                            htmlType="submit"
                            loading={submitting}
                        >
                            Tạo tài khoản
                        </Button>
                    </Form>

                    <p className="auth-switch">
                        Đã có tài khoản?
                        <button type="button" onClick={() => navigate('/login')}>Đăng nhập</button>
                    </p>
                </div>
            </main>
        </div>
    );
}
