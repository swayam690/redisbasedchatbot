import React, { useState, useEffect } from 'react';
import { Zap, RefreshCw, Key, Database, Clock, Layers, Code, Eye } from 'lucide-react';
import { getRedisKeysApi } from '../services/api';

export default function RedisInspectorView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await getRedisKeysApi();
      if (res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
    const interval = setInterval(fetchKeys, 4000);
    return () => clearInterval(interval);
  }, []);

  const keys = data?.keys || [];
  const engine = data?.redis_engine || {};

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--amber)' }}>
            <Zap size={24} /> Live Redis Store Inspector
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Inspect active keys, data types, expiration TTLs, and contents stored inside Redis in real time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge badge-emerald" style={{ padding: '6px 12px' }}>
            <Database size={14} /> Engine: {engine.mode || 'Fakeredis'}
          </span>
          <button onClick={fetchKeys} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <RefreshCw size={14} className={loading ? 'animate-pulse-glow' : ''} /> Refresh Store
          </button>
        </div>
      </div>

      {/* Grid View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Keys Table */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={18} color="var(--cyan)" /> Keys in Memory ({keys.length})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Auto-refreshes every 4s</span>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '520px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {keys.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active Redis keys found. Interact with the chat or FAQs to populate keys!
              </div>
            ) : (
              keys.map((kItem) => {
                const isSelected = selectedKey?.key === kItem.key;
                return (
                  <div
                    key={kItem.key}
                    className="glass-card"
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : undefined,
                      borderColor: isSelected ? 'var(--primary)' : undefined
                    }}
                    onClick={() => setSelectedKey(kItem)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '13px', color: '#fff' }}>
                        {kItem.key}
                      </span>
                      <span
                        className={`badge ${
                          kItem.type === 'string'
                            ? 'badge-cyan'
                            : kItem.type === 'hash'
                            ? 'badge-purple'
                            : kItem.type === 'list'
                            ? 'badge-emerald'
                            : 'badge-amber'
                        }`}
                        style={{ fontSize: '10px' }}
                      >
                        {kItem.type.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                        {kItem.value_preview}
                      </span>
                      <span>
                        <Clock size={10} style={{ display: 'inline', marginRight: '3px' }} />
                        {kItem.ttl > 0 ? `${kItem.ttl}s` : kItem.ttl === -1 ? 'No Expiry' : 'Expired'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Key Detail Inspector */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Eye size={18} /> Decoded Payload Inspector
          </h3>

          {selectedKey ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Key Name:</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: '700', color: 'var(--cyan)' }}>
                  {selectedKey.key}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="glass-card" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Data Type:</div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{selectedKey.type.toUpperCase()}</div>
                </div>

                <div className="glass-card" style={{ padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expiration (TTL):</div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--amber)' }}>
                    {selectedKey.ttl > 0 ? `${selectedKey.ttl} seconds` : 'Persistent'}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                  Decoded Value:
                </div>
                <pre
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--emerald)',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '320px'
                  }}
                >
                  {selectedKey.value_preview}
                </pre>
              </div>
            </div>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Code size={40} color="var(--text-subtle)" style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '13px' }}>Select any key from the left list to inspect its contents and TTL.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
