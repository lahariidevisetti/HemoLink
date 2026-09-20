// src/pages/donor/DonorHistory.jsx — My donation response history

import { useState, useEffect } from 'react';
import { donorApi } from '../../services/api';
import DonorLayout from '../../components/donor/DonorLayout';
import './Donor.css';

const STATUS_COLORS = { Pending:'#d97706', Accepted:'#16a34a', Rejected:'#dc2626', Completed:'#2563eb' };

export default function DonorHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    donorApi.getHistory()
      .then(data => setHistory(data.history || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DonorLayout>
      <div className="page-content">
        <p className="page-tag">History</p>
        <h1 className="page-title">Donation History 📜</h1>
        <p className="page-sub">All blood requests you have responded to.</p>

        {loading && <div className="loading-text">Loading history...</div>}
        {!loading && history.length === 0 && (
          <div className="empty-state">
            <p>📜 No donation history yet.</p>
            <p style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>Respond to blood requests from the dashboard to get started.</p>
          </div>
        )}

        <div className="requests-list">
          {history.map(h => (
            <div key={h.id} className="request-card">
              <div className="request-left">
                <span className="blood-badge">{h.blood_group}</span>
                <div>
                  <p className="request-hospital">{h.hospital_name}</p>
                  <p className="request-meta">📍 {h.city} · ⚡ {h.urgency}</p>
                  <p className="request-receiver">Receiver: {h.receiver_name}</p>
                  <p className="request-meta" style={{ color:'#9ca3af' }}>{new Date(h.responded_at).toLocaleString()}</p>
                </div>
              </div>
              <span className="urgency-badge" style={{ background: STATUS_COLORS[h.status] + '20', color: STATUS_COLORS[h.status] }}>{h.status}</span>
            </div>
          ))}
        </div>
      </div>
    </DonorLayout>
  );
}
