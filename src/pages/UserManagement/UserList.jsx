import React, { useCallback, useEffect, useState } from 'react';
import { App, Button, Flex, Spin, Table, Tag, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { authApi, ROLE_LABELS, ROLES } from '../../services/authApi';
import { parseApiError } from '../../utils/apiError';
import { formatDate } from '../../utils/formatDate';
import { useAuth } from '../../context/AuthContext';
import AddUserModal from './components/AddUserModal';

const { Title, Text } = Typography;

export default function UserList() {
    const { message } = App.useApp();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await authApi.getUsers();
            setUsers(data);
        } catch (error) {
            message.error(parseApiError(error, 'Không tải được danh sách người dùng.').message);
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const columns = [
        {
            title: '#',
            key: 'index',
            width: 56,
            align: 'center',
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Họ và tên',
            dataIndex: 'fullName',
            key: 'fullName',
            render: (fullName, record) => (
                <span>
                    {fullName}
                    {record.username === currentUser?.username && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>Bạn</Tag>
                    )}
                </span>
            ),
        },
        { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username', width: 180 },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            width: 140,
            render: (role) => (
                <Tag color={role === ROLES.LECTURER ? 'geekblue' : 'green'}>
                    {ROLE_LABELS[role] || role}
                </Tag>
            ),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 140,
            render: (value) => (value ? formatDate(value) : '—'),
        },
    ];

    return (
        <div style={{ padding: '25px 28px 44px' }}>
            <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 18 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Quản lý người dùng</Title>
                    <Text type="secondary">Tạo tài khoản Giảng viên và Sinh viên cho hệ thống</Text>
                </div>
                <Flex gap={8}>
                    <Button icon={<ReloadOutlined />} onClick={fetchUsers}>Tải lại</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                        Thêm người dùng
                    </Button>
                </Flex>
            </Flex>

            <Spin spinning={loading}>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={users}
                    pagination={false}
                    locale={{ emptyText: 'Chưa có người dùng nào' }}
                />
            </Spin>

            <AddUserModal
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onSaved={() => {
                    setModalOpen(false);
                    fetchUsers();
                }}
            />
        </div>
    );
}
