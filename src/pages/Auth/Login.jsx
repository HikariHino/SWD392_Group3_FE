import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Form, Input } from 'antd';
import {
    AuditOutlined,
    BookOutlined,
    CheckCircleOutlined,
    LockOutlined,
    SoundOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { HOME_PATH_BY_ROLE } from '../../services/authApi';
import { parseApiError } from '../../utils/apiError';
import './Auth.css';

export default function Login() {
    const { message } = App.useApp();
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);

    const handleSubmit = async (values) => {
        setSubmitting(true);
        setServerError(null);
        try {
            const user = await login({
                username: values.username.trim(),
                password: values.password,
            });
            message.success(`Xin chào ${user.fullName}!`);

            // Quay lại trang người dùng định vào trước khi bị chặn, nếu không thì về trang chính theo vai trò
            const from = location.state?.from?.pathname;
            navigate(from || HOME_PATH_BY_ROLE[user.role] || '/', { replace: true });
        } catch (error) {
            const { message: errorMessage, fieldErrors } = parseApiError(error, 'Đăng nhập thất bại.');
            // 401 = sai tài khoản hoặc mật khẩu
            setServerError(
                error.response?.status === 401
                    ? 'Tên đăng nhập hoặc mật khẩu không đúng.'
                    : errorMessage,
            );
            form.setFields(
                fieldErrors.filter((f) => f.name.length > 0).map((f) => ({ name: f.name, errors: [f.error] })),
            );
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
                    <h2>Chấm thi vấn đáp nhanh và công bằng hơn</h2>
                    <p>
                        AIVES hỗ trợ giảng viên xây dựng ngân hàng câu hỏi chuẩn Rubric, tổ chức phòng thi
                        vấn đáp với AI và thẩm định điểm dựa trên transcript thực tế.
                    </p>
                    <ul className="auth-points">
                        <li><CheckCircleOutlined /> Ngân hàng câu hỏi phân loại theo thang Bloom</li>
                        <li><SoundOutlined /> Phòng thi vấn đáp trực tuyến, ghi transcript tự động</li>
                        <li><AuditOutlined /> Ma trận Rubric minh bạch cho từng tiêu chí chấm</li>
                    </ul>
                </div>

                <div className="auth-foot">SWD392 Group 3 © {new Date().getFullYear()}</div>
            </aside>

            <main className="auth-panel">
                <div className="auth-card">
                    <h1>Đăng nhập</h1>
                    <p>Dùng tài khoản được nhà trường cấp để vào hệ thống.</p>

                    {serverError && (
                        <Alert type="error" showIcon style={{ marginBottom: 16 }} title={serverError} />
                    )}

                    <Form
                        form={form}
                        className="auth-form"
                        layout="vertical"
                        requiredMark={false}
                        onFinish={handleSubmit}
                        disabled={submitting}
                    >
                        <Form.Item
                            name="username"
                            label="Tên đăng nhập"
                            rules={[
                                { required: true, message: 'Vui lòng nhập tên đăng nhập.' },
                                { max: 50, message: 'Tên đăng nhập không được vượt quá 50 ký tự.' },
                            ]}
                        >
                            <Input
                                size="large"
                                prefix={<UserOutlined />}
                                placeholder="VD: lecturer01"
                                autoComplete="username"
                                autoFocus
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Mật khẩu"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
                        >
                            <Input.Password
                                size="large"
                                prefix={<LockOutlined />}
                                placeholder="Nhập mật khẩu"
                                autoComplete="current-password"
                            />
                        </Form.Item>

                        <Button
                            className="auth-submit"
                            type="primary"
                            size="large"
                            htmlType="submit"
                            loading={submitting}
                        >
                            Đăng nhập
                        </Button>
                    </Form>

                    <p className="auth-switch">
                        Chưa có tài khoản?
                        <button type="button" onClick={() => navigate('/register')}>Đăng ký ngay</button>
                    </p>
                </div>
            </main>
        </div>
    );
}
