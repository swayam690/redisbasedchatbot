import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getWsUrl = (sessionId) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//localhost:8000/api/chat/ws/${sessionId}`;
};

// Chat APIs
export const sendMessageApi = (sessionId, message, customerName) =>
  api.post('/api/chat/message', { session_id: sessionId, message, customer_name: customerName });

export const getChatHistoryApi = (sessionId) =>
  api.get(`/api/chat/history/${sessionId}`);

export const rateChatApi = (sessionId, score, feedback) =>
  api.post('/api/chat/rate', { session_id: sessionId, score, feedback });

// FAQ APIs
export const getFaqsApi = () => api.get('/api/faqs');
export const createFaqApi = (data) => api.post('/api/faqs', data);
export const deleteFaqApi = (id) => api.delete(`/api/faqs/${id}`);

// Human Agent APIs
export const getAgentTicketsApi = () => api.get('/api/agent/tickets');
export const takeoverSessionApi = (sessionId, agentName) =>
  api.post('/api/agent/takeover', { session_id: sessionId, agent_name: agentName });
export const sendAgentMessageApi = (sessionId, agentName, message) =>
  api.post('/api/agent/message', { session_id: sessionId, agent_name: agentName, message });
export const resolveTicketApi = (sessionId) =>
  api.post(`/api/agent/resolve/${sessionId}`);

// Analytics & Redis Inspector APIs
export const getAnalyticsApi = () => api.get('/api/analytics');
export const getRedisKeysApi = () => api.get('/api/redis/keys');
