import React, { useState, useEffect, useRef } from 'react';
import { Headset, UserCheck, MessageSquare, CheckCircle, Clock, Send, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { getAgentTicketsApi, takeoverSessionApi, sendAgentMessageApi, resolveTicketApi, getChatHistoryApi } from '../services/api';

const CANNED_RESPONSES = [
  "Hello! I am Sarah from Senior Support. I've taken over your ticket and am looking into this right now.",
  "I have verified your order status in our warehouse system. Your replacement package has been dispatched!",
  "I have issued a 100% full refund back to your original payment method. The credit will reflect in 2-3 days.",
  "Thank you for your patience! Is there anything else I can assist you with today?"
];

export default function AgentDashboard() {
  const [agentName, setAgentName] = useState('Sarah Jenkins (Senior Agent)');
  const [tickets, setTickets] = useState({ pending: [], active: [], resolved: [] });
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [agentInput, setAgentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const fetchTickets = async () => {
    try {
      const res = await getAgentTicketsApi();
      if (res.data) {
        setTickets(res.data);
      }
    } catch (e) {
      console.error('Error fetching agent tickets:', e);
    }
  };

  const loadSessionChat = async (sid) => {
    setSelectedSessionId(sid);
    try {
      const res = await getChatHistoryApi(sid);
      if (res.data && res.data.messages) {
        setChatMessages(res.data.messages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 3000); // Polling Redis tickets queue
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      const chatInterval = setInterval(() => {
        getChatHistoryApi(selectedSessionId).then((res) => {
          if (res.data?.messages) setChatMessages(res.data.messages);
        });
      }, 2000);
      return () => clearInterval(chatInterval);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleTakeover = async (sessionId) => {
    setLoading(true);
    try {
      await takeoverSessionApi(sessionId, agentName);
      await fetchTickets();
      await loadSessionChat(sessionId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAgentMessage = async (customMsg = null) => {
    const text = customMsg || agentInput;
    if (!text.trim() || !selectedSessionId) return;

    if (!customMsg) setAgentInput('');

    try {
      await sendAgentMessageApi(selectedSessionId, agentName, text);
      const res = await getChatHistoryApi(selectedSessionId);
      if (res.data?.messages) setChatMessages(res.data.messages);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (sessionId) => {
    try {
      await resolveTicketApi(sessionId);
      await fetchTickets();
      setSelectedSessionId(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>
      
      {/* Left Column: Escalated Ticket Queues */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Agent Profile & Refresh */}
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Logged in Specialist:</div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--cyan)' }}>{agentName}</div>
          </div>
          <button onClick={fetchTickets} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Pending Tickets Queue */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--amber)' }}>
              <AlertTriangle size={18} /> Urgent Handoff Queue
            </h3>
            <span className="badge badge-amber">{tickets.pending.length} Waiting</span>
          </div>

          {tickets.pending.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
              No pending customer escalations right now. AI is handling all chats!
            </div>
          ) : (
            tickets.pending.map((tk) => (
              <div
                key={tk.session_id}
                className="glass-card"
                style={{ padding: '14px', cursor: 'pointer', borderLeft: '4px solid var(--amber)' }}
                onClick={() => loadSessionChat(tk.session_id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700', fontSize: '13px' }}>👤 {tk.customer_name || 'Customer'}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>
                    {new Date(tk.requested_at * 1000).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  "{tk.last_message}"
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleTakeover(tk.session_id); }}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '6px 12px' }}
                >
                  <UserCheck size={14} /> Take Over Chat
                </button>
              </div>
            ))
          )}
        </div>

        {/* Active Handled Chats */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cyan)' }}>
              <Headset size={18} /> Active Agent Chats
            </h3>
            <span className="badge badge-cyan">{tickets.active.length} Active</span>
          </div>

          {tickets.active.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No active taken-over chats.
            </div>
          ) : (
            tickets.active.map((tk) => (
              <div
                key={tk.session_id}
                className="glass-card"
                style={{
                  padding: '12px 14px',
                  cursor: 'pointer',
                  background: selectedSessionId === tk.session_id ? 'rgba(6, 182, 212, 0.15)' : undefined,
                  borderColor: selectedSessionId === tk.session_id ? 'var(--cyan)' : undefined
                }}
                onClick={() => loadSessionChat(tk.session_id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>{tk.customer_name || tk.session_id}</span>
                  <span className="badge badge-cyan" style={{ fontSize: '10px' }}>In Progress</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Right Column: Live Chat & Intercept Panel */}
      <div className="glass-panel" style={{ height: '740px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {selectedSessionId ? (
          <>
            {/* Header for Active Chat */}
            <div style={{ padding: '16px 24px', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--cyan)' }}>
                  Live Chat with Session: {selectedSessionId}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Messages synchronized in real-time via Redis PubSub</p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleTakeover(selectedSessionId)}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  <UserCheck size={14} /> Assign Me
                </button>
                <button
                  onClick={() => handleResolve(selectedSessionId)}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontSize: '12px', padding: '6px 12px' }}
                >
                  <CheckCircle size={14} /> Resolve Ticket
                </button>
              </div>
            </div>

            {/* Chat Messages Feed */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(11, 15, 25, 0.5)' }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  style={{
                    alignSelf: msg.sender === 'agent' ? 'flex-end' : msg.sender === 'customer' ? 'flex-start' : 'center',
                    maxWidth: msg.sender === 'system' ? '100%' : '75%'
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '2px' }}>
                    {msg.sender === 'agent' ? `🎧 ${msg.agent_name || 'Agent'}` : msg.sender === 'customer' ? '👤 Customer' : '⚙ System'}
                  </div>
                  <div
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      background: msg.sender === 'agent'
                        ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                        : msg.sender === 'customer'
                        ? 'rgba(30, 41, 59, 0.9)'
                        : 'rgba(245, 158, 11, 0.15)',
                      color: msg.sender === 'system' ? 'var(--amber)' : '#ffffff',
                      border: msg.sender === 'system' ? '1px dashed var(--amber)' : '1px solid var(--border-color)'
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Canned Responses */}
            <div style={{ padding: '8px 16px', background: 'rgba(15, 23, 42, 0.9)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '6px', overflowX: 'auto' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-subtle)', alignSelf: 'center', whiteSpace: 'nowrap' }}>Canned Replies:</span>
              {CANNED_RESPONSES.map((resText, rIdx) => (
                <button
                  key={rIdx}
                  onClick={() => handleSendAgentMessage(resText)}
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                >
                  Preset #{rIdx + 1}
                </button>
              ))}
            </div>

            {/* Agent Input */}
            <div style={{ padding: '16px 20px', background: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Type response to customer as support agent..."
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAgentMessage()}
              />
              <button onClick={() => handleSendAgentMessage()} className="btn-primary" style={{ padding: '12px 20px' }}>
                <Send size={18} /> Reply
              </button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Headset size={48} color="var(--text-subtle)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>Support Specialist Console</h3>
            <p style={{ fontSize: '14px', maxWidth: '400px' }}>Select an escalated ticket from the queue on the left to review chat history and assist the customer.</p>
          </div>
        )}

      </div>

    </div>
  );
}
