import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from 'antd';
import { LoginOutlined, SoundOutlined } from '@ant-design/icons';
import { parseSessionId } from '../../utils/examFlow';
import { ExamHeader } from './ExamRoom';
import './ExamRoom.css';

// Backend chưa có API liệt kê ca thi cho sinh viên nên vào phòng bằng mã/link giảng viên gửi
export default function ExamLobby() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const sessionId = parseSessionId(code);
    if (!sessionId) {
      setError('Mã ca thi chưa đúng. Hãy dán nguyên mã hoặc link giảng viên gửi.');
      return;
    }
    navigate(`/exam-room/${sessionId}`);
  };

  return (
    <div className="exam-room-page">
      <ExamHeader />
      <main className="exam-center">
        <form className="exam-panel exam-center-card" onSubmit={handleSubmit}>
          <span className="robot-mark large"><SoundOutlined /></span>
          <h1>Vào phòng thi vấn đáp</h1>
          <p>Dán mã ca thi hoặc link giảng viên đã gửi cho bạn.</p>
          <div className="lobby-field">
            <label htmlFor="session-code">Mã ca thi</label>
            <Input
              id="session-code"
              size="large"
              value={code}
              status={error ? 'error' : undefined}
              autoComplete="off"
              placeholder="VD: 0f8fad5b-d9cb-469f-a165-70867728950e"
              onChange={(event) => {
                setCode(event.target.value);
                setError('');
              }}
            />
            {error && <small role="alert">{error}</small>}
          </div>
          <button className="btn btn-primary lobby-submit" type="submit"><LoginOutlined /> Vào phòng thi</button>
        </form>
      </main>
    </div>
  );
}
