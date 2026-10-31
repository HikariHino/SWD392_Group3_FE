import { useCallback, useEffect, useRef, useState } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { UNAUTHORIZED_EVENT } from '../services/authStorage';
import { createInterviewConnection, HUB_EVENTS, HUB_METHODS } from '../services/signalRService';

// withAutomaticReconnect chỉ lo khi đã từng kết nối; lần start đầu phải tự thử lại
const START_RETRY_DELAYS_MS = [2000, 5000, 10000];

/**
 * Giữ kết nối tới InterviewHub trong lúc sinh viên làm bài.
 * status: idle | connecting | connected | reconnecting | disconnected
 */
export const useSignalR = ({ enabled, onFollowUp, onReconnected }) => {
    const [status, setStatus] = useState('idle');
    const [connectAttempt, setConnectAttempt] = useState(0);
    const connectionRef = useRef(null);
    const handlers = useRef({ onFollowUp, onReconnected });

    useEffect(() => {
        handlers.current = { onFollowUp, onReconnected };
    });

    useEffect(() => {
        if (!enabled) return undefined;

        let stopped = false;
        let retryTimer = null;
        const connection = createInterviewConnection();
        connectionRef.current = connection;

        connection.on(HUB_EVENTS.RECEIVE_FOLLOW_UP, (followUp) => handlers.current.onFollowUp?.(followUp));
        connection.onreconnecting(() => setStatus('reconnecting'));
        connection.onreconnected(() => {
            setStatus('connected');
            handlers.current.onReconnected?.();
        });
        connection.onclose(() => {
            if (!stopped) setStatus('disconnected');
        });

        const start = async (retry = 0) => {
            setStatus('connecting');
            try {
                await connection.start();
                if (!stopped) setStatus('connected');
            } catch (error) {
                // StrictMode dừng kết nối ngay trong lúc negotiate: lỗi này không cần báo
                if (stopped) return;
                if (error?.statusCode === 401) {
                    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
                    return;
                }
                if (retry < START_RETRY_DELAYS_MS.length) {
                    retryTimer = window.setTimeout(() => start(retry + 1), START_RETRY_DELAYS_MS[retry]);
                } else {
                    setStatus('disconnected');
                }
            }
        };
        start();

        return () => {
            stopped = true;
            window.clearTimeout(retryTimer);
            connectionRef.current = null;
            connection.stop().catch(() => {});
        };
    }, [enabled, connectAttempt]);

    const requestFollowUp = useCallback((attemptId) => {
        const connection = connectionRef.current;
        if (connection?.state !== HubConnectionState.Connected) {
            return Promise.reject(new Error('Hub chưa kết nối.'));
        }
        return connection.invoke(HUB_METHODS.REQUEST_FOLLOW_UP, attemptId);
    }, []);

    const reconnect = useCallback(() => setConnectAttempt((value) => value + 1), []);

    return { status: enabled ? status : 'idle', requestFollowUp, reconnect };
};
