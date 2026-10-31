import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { getToken } from './authStorage';
import { hubUrlFrom } from '../utils/examFlow';

// Hub Backend: WebApi/Hubs/InterviewHub.cs
export const HUB_METHODS = { REQUEST_FOLLOW_UP: 'RequestFollowUp' };
export const HUB_EVENTS = { RECEIVE_FOLLOW_UP: 'ReceiveAIFollowUp' };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5110/api';
const RECONNECT_DELAYS_MS = [0, 2000, 5000, 10000, 15000];

export const createInterviewConnection = () =>
    new HubConnectionBuilder()
        .withUrl(hubUrlFrom(API_BASE_URL), { accessTokenFactory: () => getToken() ?? '' })
        .withAutomaticReconnect(RECONNECT_DELAYS_MS)
        .configureLogging(LogLevel.Warning)
        .build();
