import React from 'react';
import { MessageSquare, Headset, BarChart3, Database, Cpu, Zap, Activity } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, systemInfo }) {
  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '14px 28px', marginBottom: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Cpu size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              OmniSupport <span style={{ color: 'var(--cyan)', fontSize: '12px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>AI v1.0</span>
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>FastAPI + Redis + React Customer Service Engine</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.7)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('chat')}
            className={activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}
            style={{ borderRadius: '10px', fontSize: '13px', padding: '8px 14px' }}
          >
            <MessageSquare size={16} /> Customer Portal
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={activeTab === 'agent' ? 'btn-primary' : 'btn-secondary'}
            style={{ borderRadius: '10px', fontSize: '13px', padding: '8px 14px' }}
          >
            <Headset size={16} /> Agent Workspace
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}
            style={{ borderRadius: '10px', fontSize: '13px', padding: '8px 14px' }}
          >
            <BarChart3 size={16} /> Analytics
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={activeTab === 'faqs' ? 'btn-primary' : 'btn-secondary'}
            style={{ borderRadius: '10px', fontSize: '13px', padding: '8px 14px' }}
          >
            <Database size={16} /> FAQ Cache
          </button>
          <button
            onClick={() => setActiveTab('redis')}
            className={activeTab === 'redis' ? 'btn-primary' : 'btn-secondary'}
            style={{ borderRadius: '10px', fontSize: '13px', padding: '8px 14px' }}
          >
            <Zap size={16} /> Redis Inspector
          </button>
        </nav>

        {/* System Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-emerald">
            <Activity size={12} className="animate-pulse-glow" /> FastAPI Online
          </span>
          <span className="badge badge-cyan">
            <Zap size={12} /> {systemInfo?.redis_engine?.mode || 'Redis Engine'}
          </span>
        </div>

      </div>
    </header>
  );
}
