import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Package, RefreshCw, 
  HelpCircle, UserCheck, Star, ShieldCheck, Sparkles, CheckCircle2, Clock, Truck, Zap 
} from 'lucide-react';
import { sendMessageApi, getChatHistoryApi, rateChatApi, getWsUrl } from '../services/api';

export default function CustomerWidget() {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('omni_session_id') || `session_${Math.random().toString(36).substring(2, 9)}`);
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('omni_customer_name') || 'Alex Rivera');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');

  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('omni_session_id', sessionId);
    localStorage.setItem('omni_customer_name', customerName);
  }, [sessionId, customerName]);

  // Load chat history from Redis
  const loadHistory = async () => {
    try {
      const res = await getChatHistoryApi(sessionId);
      if (res.data && res.data.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  useEffect(() => {
    loadHistory();
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Connect WebSocket
  const connectWebSocket = () => {
    try {
      const wsUrl = getWsUrl(sessionId);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          setMessages((prev) => {
            // Avoid duplicate message IDs
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // Text to speech if AI message and TTS enabled
          if (msg.sender === 'ai' && ttsEnabled && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(msg.text);
            window.speechSynthesis.speak(utterance);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error, using REST API:', err);
        setWsConnected(false);
      };

      socketRef.current = ws;
    } catch (e) {
      setWsConnected(false);
    }
  };

  const handleSend = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    if (!customText) setInputMessage('');
    setLoading(true);

    try {
      if (wsConnected && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          session_id: sessionId,
          message: textToSend,
          customer_name: customerName
        }));
      } else {
        // Fallback to REST API
        const res = await sendMessageApi(sessionId, textToSend, customerName);
        if (res.data) {
          await loadHistory();
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  // Voice speech-to-text recognition
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech Recognition is not supported in your browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const submitRating = async () => {
    try {
      await rateChatApi(sessionId, selectedRating, feedbackText);
      setRatingSubmitted(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Session & Customer Info Bar */}
      <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <UserCheck size={18} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Logged in as Customer:</div>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontWeight: '700', fontSize: '15px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setTtsEnabled(!ttsEnabled)} 
            className="btn-secondary" 
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            {ttsEnabled ? <Volume2 size={14} color="var(--emerald)" /> : <VolumeX size={14} />}
            {ttsEnabled ? 'Voice Reader ON' : 'Voice Reader OFF'}
          </button>

          <span className={`badge ${wsConnected ? 'badge-emerald' : 'badge-amber'}`}>
            <Zap size={12} /> {wsConnected ? 'WebSocket Live' : 'REST Mode'}
          </span>
          
          <button 
            onClick={() => {
              const newSid = `session_${Math.random().toString(36).substring(2, 9)}`;
              setSessionId(newSid);
              setMessages([]);
            }} 
            className="btn-secondary" 
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <RefreshCw size={14} /> New Chat Session
          </button>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="glass-panel" style={{ height: '620px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Messages Stream */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Welcome Card if empty */}
          {messages.length === 0 && (
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center', maxWidth: '600px', margin: 'auto' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 0 24px var(--primary-glow)' }}>
                <Sparkles size={28} color="#fff" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Welcome to OmniCustomer AI!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
                How can we assist you today? Ask about your orders, returns, tech troubleshooting, or request live support.
              </p>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((msg, index) => {
            const isCustomer = msg.sender === 'customer';
            const isAgent = msg.sender === 'agent';
            const isSystem = msg.sender === 'system';

            return (
              <div
                key={msg.id || index}
                className="animate-fade-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isCustomer ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  alignSelf: isCustomer ? 'flex-end' : 'flex-start'
                }}
              >
                {/* Sender Tag */}
                <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isCustomer && <span>{msg.customer_name || customerName}</span>}
                  {isAgent && <span style={{ color: 'var(--cyan)', fontWeight: '600' }}>🎧 {msg.agent_name || 'Support Agent'}</span>}
                  {msg.sender === 'ai' && <span style={{ color: 'var(--purple)', fontWeight: '600' }}>⚡ Omni AI Assistant</span>}
                  {isSystem && <span style={{ color: 'var(--amber)' }}>⚙ System Event</span>}

                  {msg.cache_hit && (
                    <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--emerald)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      ⚡ {msg.processing_time_ms || 4}ms (Redis Cache Hit)
                    </span>
                  )}
                </div>

                {/* Bubble Container */}
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: isCustomer ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isCustomer
                      ? 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'
                      : isAgent
                      ? 'linear-gradient(135deg, #0e7490 0%, #155e75 100%)'
                      : isSystem
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'rgba(30, 41, 59, 0.85)',
                    border: isCustomer
                      ? 'none'
                      : isSystem
                      ? '1px dashed rgba(245, 158, 11, 0.4)'
                      : '1px solid var(--border-color)',
                    color: isSystem ? 'var(--amber)' : '#ffffff',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    boxShadow: isCustomer ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  {msg.text}

                  {/* Render Structured Cards if present */}
                  {msg.card_data && msg.card_data.type === 'order_tracking' && (
                    <div style={{ marginTop: '14px', background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--cyan)' }}>{msg.card_data.item}</span>
                        <span className="badge badge-emerald">{msg.card_data.status}</span>
                      </div>
                      
                      {/* Step Progress Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', position: 'relative' }}>
                        {['Placed', 'Shipped', 'Out for Delivery', 'Delivered'].map((stepName, i) => {
                          const isDone = (i + 1) <= msg.card_data.progress_step;
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                              <div style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                background: isDone ? 'var(--emerald)' : '#334155',
                                color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700',
                                marginBottom: '4px'
                              }}>
                                {isDone ? '✓' : i + 1}
                              </div>
                              <span style={{ fontSize: '10px', color: isDone ? 'var(--text-main)' : 'var(--text-subtle)', textAlign: 'center' }}>
                                {stepName}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                        <div><strong>Carrier:</strong> {msg.card_data.carrier}</div>
                        <div><strong>Tracking:</strong> {msg.card_data.tracking_num}</div>
                        <div><strong>Est. Delivery:</strong> {msg.card_data.est_delivery}</div>
                        <div><strong>Destination:</strong> {msg.card_data.destination}</div>
                      </div>
                    </div>
                  )}

                  {msg.card_data && msg.card_data.type === 'troubleshooting_guide' && (
                    <div style={{ marginTop: '12px', background: 'rgba(15, 23, 42, 0.8)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: '600', color: 'var(--amber)', marginBottom: '8px' }}>🔧 Recommended Steps:</div>
                      {msg.card_data.steps.map((step, idx) => (
                        <div key={idx} style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{step}</div>
                      ))}
                    </div>
                  )}

                  {/* Render Quick Actions */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {msg.actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleSend(act.payload)}
                          className="btn-secondary"
                          style={{ fontSize: '12px', padding: '6px 12px', background: 'rgba(99, 102, 241, 0.2)', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', padding: '8px' }}>
              <div className="animate-pulse-glow" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
              Omni AI is thinking...
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Prompt Pills */}
        <div style={{ padding: '8px 20px', background: 'rgba(15, 23, 42, 0.9)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', overflowX: 'auto' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', alignSelf: 'center', whiteSpace: 'nowrap' }}>Suggested:</span>
          <button onClick={() => handleSend('track order #12345')} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
            <Package size={12} /> Track Order #12345
          </button>
          <button onClick={() => handleSend('what is your return policy')} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
            <ShieldCheck size={12} /> Return Policy
          </button>
          <button onClick={() => handleSend('app keeps crashing during checkout')} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
            <HelpCircle size={12} /> App Error
          </button>
          <button onClick={() => handleSend('human agent')} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap', borderColor: 'rgba(244, 63, 94, 0.4)', color: 'var(--rose)' }}>
            <UserCheck size={12} /> Speak to Human Agent
          </button>
        </div>

        {/* Chat Input Bar */}
        <div style={{ padding: '16px 20px', background: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={toggleSpeechRecognition}
            className="btn-secondary"
            style={{ padding: '12px', borderRadius: '12px', background: isListening ? 'rgba(244, 63, 94, 0.2)' : undefined, color: isListening ? 'var(--rose)' : undefined }}
            title="Speech Input"
          >
            {isListening ? <MicOff size={18} className="animate-pulse-glow" /> : <Mic size={18} />}
          </button>

          <input
            type="text"
            className="input-field"
            placeholder="Type your question or request support..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputMessage.trim() || loading}
            className="btn-primary"
            style={{ padding: '12px 20px', opacity: !inputMessage.trim() || loading ? 0.6 : 1 }}
          >
            <Send size={18} /> Send
          </button>
        </div>

      </div>

      {/* CSAT Star Feedback Card */}
      <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={16} color="var(--amber)" fill="var(--amber)" /> Rate Your Customer Service Experience
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Help us improve our Redis-backed AI support system</p>
        </div>

        {ratingSubmitted ? (
          <span className="badge badge-emerald" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <CheckCircle2 size={16} /> Thank you! Rating recorded in Redis!
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                >
                  <Star
                    size={22}
                    color="var(--amber)"
                    fill={star <= selectedRating ? 'var(--amber)' : 'transparent'}
                  />
                </button>
              ))}
            </div>
            <button onClick={submitRating} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
              Submit Rating
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
