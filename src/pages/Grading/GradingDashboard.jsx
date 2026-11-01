import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Form, Input } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import { parseAttemptId } from '../../utils/gradingFlow';
import ReviewTranscript from './ReviewTranscript';
import './GradingDashboard.css';

export default function GradingDashboard() {
    const { attemptId: routeId } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const rawId = routeId ?? params.get('attemptId');
    const attemptId = parseAttemptId(rawId);
    const [value, setValue] = useState('');
    const [error, setError] = useState('');

    if (attemptId) return <ReviewTranscript key={attemptId} attemptId={attemptId} />;

    return (
        <div className="workspace-page grading-page">
            <div className="workspace-heading"><div>
                <span className="page-kicker">AIVES · HỖ TRỢ CHẤM ĐIỂM BẰNG AI</span>
                <h1>Thẩm định bài thi</h1>
                <p>Đọc transcript, đối chiếu rubric và xem điểm AI đề xuất. Giảng viên quyết định điểm cuối cùng của từng câu.</p>
            </div></div>
            <Card title={<><FileSearchOutlined /> Mở bài thi để chấm</>}>
                <Form layout="vertical" onFinish={() => {
                    const id = parseAttemptId(value);
                    if (!id) { setError('Nhập đúng mã lượt thi (UUID) hoặc link /grading/...; mã ca thi không phải mã lượt thi.'); return; }
                    navigate(`/grading/${id}`);
                }}>
                    <Form.Item label="Mã lượt thi hoặc link thẩm định" validateStatus={error || rawId ? 'error' : undefined}
                        help={error || (rawId ? 'Mã lượt thi trên đường dẫn không hợp lệ.' : undefined)}>
                        <Input id="grading-attempt-id" value={value} onChange={(event) => { setValue(event.target.value); setError(''); }} placeholder="Dán mã lượt thi hoặc link /grading/{attemptId}" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<FileSearchOutlined />}>Mở bài thi</Button>
                </Form>
            </Card>
            <Alert type="info" showIcon title="Lấy mã lượt thi ở đâu?"
                description="Sinh viên sao chép mã lượt thi trên màn hình sau khi nộp bài và gửi cho giảng viên. Hiện API chưa hỗ trợ liệt kê lượt thi theo ca." />
        </div>
    );
}
