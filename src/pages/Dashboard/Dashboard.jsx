import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Empty, Space, Spin, Statistic, Table, Tag } from 'antd';
import { BarChartOutlined, DatabaseOutlined, QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import useQuestionOverview from '../../hooks/useQuestionOverview';
import { summarizeQuestions } from '../../utils/questionStatistics';
import { getBloomLevel } from '../../utils/bloomLevel';
import '../../styles/WorkspacePages.css';

export default function Dashboard() {
    const { user } = useAuth();
    const { questions, courses, loading, error, updatedAt, reload } = useQuestionOverview();
    const stats = summarizeQuestions(questions, courses);
    return <div className="workspace-page">
        <div className="workspace-heading"><div><span className="page-kicker">AIVES · KHÔNG GIAN GIẢNG VIÊN</span><h1>Xin chào, {user?.fullName || user?.username}</h1><p>Chuẩn bị câu hỏi vấn đáp và rubric cho môn học của bạn.</p></div><Button icon={<ReloadOutlined />} loading={loading} onClick={reload}>Tải lại dữ liệu</Button></div>
        {error && <Alert type="error" showIcon title="Chưa tải được dữ liệu mới" description={error} action={<Button onClick={reload}>Thử lại</Button>} />}
        <div className="report-updated">{updatedAt ? `${error ? 'Dữ liệu cũ · ' : ''}Lần tải thành công: ${updatedAt.toLocaleString('vi-VN')}` : 'Đang chờ dữ liệu từ hệ thống'}</div>
        <Spin spinning={loading}>
            {updatedAt && <div className="report-stats"><Card><Statistic title="Câu hỏi đã lưu" value={stats.total} /></Card><Card><Statistic title="Môn học" value={courses.length} /></Card><Card><Statistic title="Tiêu chí rubric" value={stats.rubricCount} /></Card><Card><Statistic title="Câu hỏi có rubric" value={stats.withRubrics} /></Card></div>}
        </Spin>
        <div className="dashboard-destinations">
            <Card title={<><QuestionCircleOutlined /> Ngân hàng câu hỏi</>}><p>Tạo, chỉnh sửa và phân loại câu hỏi theo môn học, mức Bloom. Xây dựng tiêu chí và trọng số rubric.</p><Link className="btn btn-primary" to="/questions">Mở ngân hàng câu hỏi</Link></Card>
            <Card title={<><DatabaseOutlined /> Nhập câu hỏi từ tài liệu</>}><p>Nhập JSON hoặc CSV, xem trước và chỉnh sửa câu hỏi cùng rubric trước khi lưu.</p><Link className="btn btn-primary" to="/questions/import">Nhập câu hỏi</Link></Card>
            <Card title={<><BarChartOutlined /> Thống kê & Giám sát</>}><p>Xem phân bố Bloom, số câu hỏi theo môn và độ đầy đủ của rubric từ dữ liệu đã lưu.</p><Link className="btn btn-primary" to="/reports">Xem thống kê</Link></Card>
        </div>
        <Card title="Câu hỏi mới nhất" extra={<Link to="/questions">Xem tất cả →</Link>}>
            {!updatedAt && !loading ? <Empty description="Chưa có dữ liệu. Hãy tải lại khi kết nối sẵn sàng." /> : <Table loading={loading} rowKey="id" pagination={false} dataSource={[...questions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)} scroll={{ x: 550 }} columns={[
                { title: 'Nội dung', dataIndex: 'content' }, { title: 'Môn', dataIndex: 'courseCode', width: 110 },
                { title: 'Bloom', dataIndex: 'bloomLevel', width: 130, render: (value) => <Tag color={getBloomLevel(value)?.color}>{getBloomLevel(value)?.name ?? value}</Tag> },
            ]} />}
        </Card>
        <Space wrap><Link className="btn btn-secondary" to="/users">Quản lý người dùng</Link><Link className="btn btn-secondary" to="/exam-room">Phòng thi mô phỏng</Link><Link className="btn btn-secondary" to="/grading">Thẩm định chấm điểm</Link></Space>
    </div>;
}
