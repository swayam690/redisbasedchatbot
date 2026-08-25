import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CustomerWidget from './components/CustomerWidget';
import AgentDashboard from './components/AgentDashboard';
import AnalyticsView from './components/AnalyticsView';
import FaqManager from './components/FaqManager';
import RedisInspectorView from './components/RedisInspectorView';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    // Fetch backend system info
    api.get('/')
      .then((res) => {
        if (res.data) setSystemInfo(res.data);
      })
      .catch((err) => {
        console.warn('Backend server not reachable yet:', err);
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} systemInfo={systemInfo} />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '0 24px 40px 24px' }}>
        {activeTab === 'chat' && <CustomerWidget />}
        {activeTab === 'agent' && <AgentDashboard />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'faqs' && <FaqManager />}
        {activeTab === 'redis' && <RedisInspectorView />}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '16px 24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-subtle)' }}>
        OmniCustomer AI • Built with FastAPI, Redis & React • Enterprise Customer Service System
      </footer>
    </div>
  );
}
