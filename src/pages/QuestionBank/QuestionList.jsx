import React, { useCallback, useEffect, useState } from 'react';
import {
    App,
    Button,
    Col,
    Flex,
    Input,
    Popconfirm,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { questionApi } from '../../services/questionApi';
import { BLOOM_LEVEL_OPTIONS, getBloomLevel } from '../../utils/bloomLevel';
import { parseApiError } from '../../utils/apiError';
import { formatDate } from '../../utils/formatDate';
import QuestionFormModal from './components/QuestionFormModal';

const { Title, Text, Paragraph } = Typography;

const DEFAULT_QUERY = {
    searchTerm: '',
    courseId: undefined,
    bloomLevel: undefined,
    pageIndex: 1,
    pageSize: 10,
};

const rubricColumns = [
    { title: 'Tiêu chí', dataIndex: 'criteria', key: 'criteria' },
    { title: 'Trọng số', dataIndex: 'weight', key: 'weight', width: 120, render: (w) => `${w}%` },
    { title: 'Điểm tối đa', dataIndex: 'maxScore', key: 'maxScore', width: 120 },
];

export default function QuestionList() {
    const { message } = App.useApp();
    const [query, setQuery] = useState(DEFAULT_QUERY);
    const [searchText, setSearchText] = useState('');
    const [data, setData] = useState({ items: [], totalCount: 0 });
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);
    const [deletingId, setDeletingId] = useState(null);
    // modal = { open, questionId } ; questionId = null -> Thêm mới
    const [modal, setModal] = useState({ open: false, questionId: null });

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                pageIndex: query.pageIndex,
                pageSize: query.pageSize,
                searchTerm: query.searchTerm || undefined,
                courseId: query.courseId,
                bloomLevel: query.bloomLevel,
            };
            const { data: res } = await questionApi.getQuestions(params);

            // Trang hiện tại bị trống (VD: vừa xoá câu cuối cùng của trang) -> lùi về trang trước
            if (res.items.length === 0 && res.totalCount > 0 && query.pageIndex > 1) {
                setQuery((q) => ({ ...q, pageIndex: Math.max(1, Math.ceil(res.totalCount / q.pageSize)) }));
                return;
            }
            setData({ items: res.items, totalCount: res.totalCount });
        } catch (error) {
            message.error(parseApiError(error, 'Không tải được danh sách câu hỏi.').message);
        } finally {
            setLoading(false);
        }
    }, [query, message]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    useEffect(() => {
        questionApi
            .getCourses()
            .then(({ data: res }) => setCourses(res))
            .catch((error) => message.error(parseApiError(error, 'Không tải được danh sách môn học.').message));
    }, [message]);

    const updateFilter = (patch) => setQuery((q) => ({ ...q, ...patch, pageIndex: 1 }));

    const handleResetFilters = () => {
        setSearchText('');
        setQuery(DEFAULT_QUERY);
    };

    const handleDelete = async (record) => {
        setDeletingId(record.id);
        try {
            await questionApi.deleteQuestion(record.id);
            message.success('Đã xoá câu hỏi khỏi ngân hàng đề.');
            fetchQuestions();
        } catch (error) {
            message.error(parseApiError(error, 'Xoá câu hỏi thất bại.').message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleSaved = () => {
        const isCreate = !modal.questionId;
        setModal({ open: false, questionId: null });
        if (isCreate && query.pageIndex !== 1) {
            // Câu hỏi mới được sắp xếp lên đầu (CreatedAt giảm dần) -> quay về trang 1 để thấy ngay
            setQuery((q) => ({ ...q, pageIndex: 1 }));
        } else {
            fetchQuestions();
        }
    };

    const columns = [
        {
            title: '#',
            key: 'index',
            width: 56,
            align: 'center',
            render: (_, __, index) => (query.pageIndex - 1) * query.pageSize + index + 1,
        },
        {
            title: 'Nội dung câu hỏi',
            dataIndex: 'content',
            key: 'content',
            render: (content) => (
                <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2, tooltip: content }}>
                    {content}
                </Paragraph>
            ),
        },
        {
            title: 'Môn học',
            key: 'course',
            width: 120,
            render: (_, record) => (
                <Tooltip title={record.courseName}>
                    <Tag color="geekblue">{record.courseCode || '—'}</Tag>
                </Tooltip>
            ),
        },
        {
            title: 'Bloom Level',
            dataIndex: 'bloomLevel',
            key: 'bloomLevel',
            width: 150,
            render: (value, record) => {
                const bloom = getBloomLevel(value);
                return (
                    <Tooltip title={bloom?.label}>
                        <Tag color={bloom?.color}>
                            {value}. {bloom?.name || record.bloomLevelName}
                        </Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Rubric',
            key: 'rubrics',
            width: 100,
            align: 'center',
            render: (_, record) => <Text>{record.rubrics?.length || 0} tiêu chí</Text>,
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (value) => (value ? formatDate(value) : '—'),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 110,
            align: 'center',
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="Sửa">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            aria-label="Sửa câu hỏi"
                            onClick={() => setModal({ open: true, questionId: record.id })}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Xoá câu hỏi này?"
                        description="Câu hỏi và các tiêu chí Rubric đi kèm sẽ bị xoá khỏi ngân hàng đề."
                        okText="Xoá"
                        cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(record)}
                    >
                        <Tooltip title="Xoá">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                aria-label="Xoá câu hỏi"
                                loading={deletingId === record.id}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        Ngân hàng câu hỏi
                    </Title>
                    <Text type="secondary">Quản lý câu hỏi vấn đáp và tiêu chí chấm điểm (Rubric)</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setModal({ open: true, questionId: null })}
                >
                    Thêm câu hỏi
                </Button>
            </Flex>

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={10}>
                    <Input.Search
                        placeholder="Tìm theo nội dung câu hỏi..."
                        allowClear
                        value={searchText}
                        onChange={(e) => {
                            setSearchText(e.target.value);
                            if (!e.target.value) updateFilter({ searchTerm: '' });
                        }}
                        onSearch={(value) => updateFilter({ searchTerm: value.trim() })}
                    />
                </Col>
                <Col xs={12} md={6}>
                    <Select
                        style={{ width: '100%' }}
                        placeholder="Lọc theo môn học"
                        allowClear
                        value={query.courseId}
                        onChange={(value) => updateFilter({ courseId: value })}
                        options={courses.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                    />
                </Col>
                <Col xs={12} md={5}>
                    <Select
                        style={{ width: '100%' }}
                        placeholder="Lọc theo Bloom Level"
                        allowClear
                        value={query.bloomLevel}
                        onChange={(value) => updateFilter({ bloomLevel: value })}
                        options={BLOOM_LEVEL_OPTIONS}
                    />
                </Col>
                <Col xs={24} md={3}>
                    <Tooltip title="Xoá bộ lọc và tải lại">
                        <Button block icon={<ReloadOutlined />} onClick={handleResetFilters}>
                            Làm mới
                        </Button>
                    </Tooltip>
                </Col>
            </Row>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={data.items}
                loading={loading}
                scroll={{ x: 900 }}
                expandable={{
                    expandedRowRender: (record) => (
                        <Table
                            rowKey="id"
                            size="small"
                            columns={rubricColumns}
                            dataSource={record.rubrics}
                            pagination={false}
                        />
                    ),
                    rowExpandable: (record) => record.rubrics?.length > 0,
                }}
                pagination={{
                    current: query.pageIndex,
                    pageSize: query.pageSize,
                    total: data.totalCount,
                    showSizeChanger: true,
                    pageSizeOptions: [5, 10, 20, 50],
                    showTotal: (total) => `Tổng ${total} câu hỏi`,
                    onChange: (pageIndex, pageSize) =>
                        setQuery((q) => ({ ...q, pageIndex: pageSize !== q.pageSize ? 1 : pageIndex, pageSize })),
                }}
                locale={{ emptyText: 'Chưa có câu hỏi nào' }}
            />

            <QuestionFormModal
                open={modal.open}
                questionId={modal.questionId}
                courses={courses}
                defaultCourseId={query.courseId}
                onCancel={() => setModal({ open: false, questionId: null })}
                onSaved={handleSaved}
            />
        </div>
    );
}
