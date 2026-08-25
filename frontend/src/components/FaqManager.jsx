import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Search, CheckCircle2, Zap, Tag } from 'lucide-react';
import { getFaqsApi, createFaqApi, deleteFaqApi } from '../services/api';

export default function FaqManager() {
  const [faqs, setFaqs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newKeywords, setNewKeywords] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchFaqs = async () => {
    try {
      const res = await getFaqsApi();
      if (res.data) setFaqs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setLoading(true);
    try {
      const kwList = newKeywords.split(',').map((k) => k.trim()).filter(Boolean);
      await createFaqApi({
        question: newQuestion,
        answer: newAnswer,
        category: newCategory,
        keywords: kwList
      });

      setNewQuestion('');
      setNewAnswer('');
      setNewKeywords('');
      setShowAddModal(false);
      await fetchFaqs();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (faqId) => {
    try {
      await deleteFaqApi(faqId);
      await fetchFaqs();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Actions */}
      <div className="glass-panel" style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={24} color="var(--primary)" /> Redis FAQ Knowledge Base Cache
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            FAQs are stored in Redis (`setex`) with automatic 1-hour TTL caching for ultra-fast customer responses.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={18} /> Add New FAQ Article
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Search size={18} color="var(--text-subtle)" />
        <input
          type="text"
          className="input-field"
          style={{ border: 'none', background: 'none', padding: 0 }}
          placeholder="Search FAQs cached in Redis by title, answer, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <span className="badge badge-cyan">{filteredFaqs.length} Articles</span>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--primary-glow)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Add FAQ Article to Redis Cache</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Question Title:</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. How do I change my shipping address?"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Answer Content:</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Detailed answer text provided to customers..."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Category:</label>
                <select
                  className="input-field"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="General">General</option>
                  <option value="Returns & Refunds">Returns & Refunds</option>
                  <option value="Shipping & Delivery">Shipping & Delivery</option>
                  <option value="Account & Tech Support">Account & Tech Support</option>
                  <option value="Billing & Payment">Billing & Payment</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Keywords (comma separated):</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="address, shipping, edit, update"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                <CheckCircle2 size={16} /> Save & Cache in Redis
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FAQ Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {filteredFaqs.map((faq) => (
          <div key={faq.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span className="badge badge-purple">{faq.category}</span>
                <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                  <Zap size={10} /> Redis Cached
                </span>
              </div>

              <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>
                {faq.question}
              </h4>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>
                {faq.answer}
              </p>
            </div>

            <div>
              {faq.keywords && faq.keywords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                  {faq.keywords.map((kw, i) => (
                    <span key={i} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
                      #{kw}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
                  Key: faq:{faq.id}
                </span>
                <button
                  onClick={() => handleDelete(faq.id)}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                >
                  <Trash2 size={14} /> Evict Cache
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
