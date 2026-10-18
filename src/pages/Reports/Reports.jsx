import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Empty, Progress, Select, Space, Spin, Statistic, Table, Tag } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import useQuestionOverview from '../../hooks/useQuestionOverview';
import { summarizeQuestions } from '../../utils/questionStatistics';
import { getBloomLevel } from '../../utils/bloomLevel';
import { csvCell, downloadText } from '../../utils/questionImport';
import { formatDate } from '../../utils/formatDate';
import '../../styles/WorkspacePages.css';

export default function Reports() {
    const { questions, courses, loading, error, updatedAt, reload } = useQuestionOverview();
    const [courseId, setCourseId] = useState();
    const stats = useMemo(() => summarizeQuestions(questions, courses, courseId), [questions, courses, courseId]);
    const exportReport = () => {
        const rows = [['Mã môn', 'Tên môn', 'Số câu hỏi', 'Số tiêu chí rubric'], ...stats.courses.map((c) => [c.code, c.name, c.questionCount, c.rubricCount])];
        downloadText(rows.map((row) => row.map(csvCell).join(',')).join('\r\n'), 'thong-ke-ngan-hang-cau-hoi.csv', 'text/csv;charset=utf-8');
    };
    return <div className="workspace-page">
        <div className="workspace-heading"><div><span className="page-kicker">BÁO CÁO · HỌC LIỆU</span><h1>Thống kê & Giám sát</h1><p>Theo dõi ngân hàng câu hỏi, phân bố Bloom và mức độ đầy đủ của rubric.</p></div><Space wrap><Button icon={<ReloadOutlined />} loading={loading} onClick={reload}>Tải lại</Button><Button icon={<DownloadOutlined />} disabled={loading || !!error || !updatedAt} onClick={exportReport}>Xuất CSV</Button></Space></div>
        <Alert showIcon type="info" title="Thống kê câu hỏi đã lưu" description="Số liệu được tổng hợp từ ngân hàng câu hỏi hiện tại. Báo cáo điểm thi, phiên thi và giám sát thời gian thực chưa có dữ liệu kết nối." />
        {error && <Alert showIcon type="error" title="Không tải được thống kê mới" description={error} action={<Button onClick={reload}>Thử lại</Button>} />}
        <div className="report-filter"><label htmlFor="report-course">Môn học</label><Select id="report-course" allowClear placeholder="Tất cả môn học" value={courseId} onChange={setCourseId} showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} /><span className="report-updated">{updatedAt ? `${error ? 'Dữ liệu cũ · ' : ''}Lần tải thành công: ${updatedAt.toLocaleString('vi-VN')}` : 'Chưa có dữ liệu thống kê'}</span></div>
        <Spin spinning={loading}>
            {!updatedAt && !loading ? <Empty description="Chưa tải được dữ liệu. Vui lòng thử lại." /> : <>
                <div className="report-stats">
                    <Card><Statistic title="Câu hỏi đã lưu" value={stats.total} /></Card>
                    <Card><Statistic title="Môn học" value={stats.courses.length} /></Card>
                    <Card><Statistic title="Tiêu chí rubric" value={stats.rubricCount} /></Card>
                    <Card><Statistic title="Câu hỏi có rubric" value={stats.withRubrics} suffix={`/ ${stats.total}`} /></Card>
                </div>
                <div className="workspace-two-columns report-content">
                    <Card title="Phân bố mức độ Bloom"><div className="bloom-distribution">{stats.blooms.map((bloom) => <div key={bloom.value}><label><span>{bloom.name} · {bloom.label}</span><strong>{bloom.count} câu</strong></label><Progress percent={stats.total ? Math.round(bloom.count / stats.total * 100) : 0} strokeColor="#3265d5" /></div>)}</div></Card>
                    <Card title="Mức độ đầy đủ của rubric"><Progress type="circle" percent={stats.coverage} /><p><strong>{stats.withRubrics}/{stats.total}</strong> câu hỏi có ít nhất một tiêu chí rubric.</p><p className="muted-text">Chỉ số phản ánh sự hiện diện của rubric, không đánh giá chất lượng nội dung hoặc mức độ phù hợp của tiêu chí.</p><Link to="/questions">Mở ngân hàng để kiểm tra rubric →</Link></Card>
                </div>
                <Card className="report-content" title="Tổng hợp theo môn học"><Table rowKey="id" dataSource={stats.courses} scroll={{ x: 550 }} pagination={{ pageSize: 10, showSizeChanger: false }} columns={[
                    { title: 'Mã môn', dataIndex: 'code' }, { title: 'Tên môn học', dataIndex: 'name' },
                    { title: 'Câu hỏi', dataIndex: 'questionCount', sorter: (a, b) => a.questionCount - b.questionCount },
                    { title: 'Tiêu chí rubric', dataIndex: 'rubricCount' },
                ]} /></Card>
                <Card className="report-content" title="Câu hỏi mới nhất"><Table rowKey="id" dataSource={[...stats.selected].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)} pagination={false} scroll={{ x: 650 }} columns={[
                    { title: 'Câu hỏi', dataIndex: 'content', ellipsis: true }, { title: 'Môn', dataIndex: 'courseCode', width: 110 },
                    { title: 'Bloom', dataIndex: 'bloomLevel', width: 130, render: (value) => <Tag color={getBloomLevel(value)?.color}>{getBloomLevel(value)?.name ?? value}</Tag> },
                    { title: 'Ngày tạo', dataIndex: 'createdAt', width: 170, render: formatDate },
                ]} /></Card>
            </>}
        </Spin>
    </div>;
}
