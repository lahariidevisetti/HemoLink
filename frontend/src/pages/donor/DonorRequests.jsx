import { useState, useEffect, useCallback } from 'react';
import { donorApi } from '../../services/api';
import ShareRequestModal from '../../components/common/ShareRequestModal';
import EmergencyDecisionModal from '../../components/common/EmergencyDecisionModal';
import DonorLayout from '../../components/donor/DonorLayout';
import { getCompatibilityDetails } from '../../utils/bloodCompatibility';
import './Donor.css';

const URGENCY_COLOR = { Critical:'#dc2626', High:'#ea580c', Medium:'#d97706', Low:'#16a34a' };

export default function DonorRequests() {
  const [requests,   setRequests]   = useState([]);
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState({ blood_group:'', city:'', urgency:'' });
  const [shareTarget, setShareTarget] = useState(null);
  const [decisionTarget, setDecisionTarget] = useState(null);

  const load = useCallback(async (f = filter) => {
    setLoading(true);
    try {
      const params = {};
      if (f.blood_group) params.blood_group = f.blood_group;
      if (f.city)        params.city        = f.city;
      if (f.urgency)     params.urgency     = f.urgency;
      const data = await donorApi.getRequests(params);
      setRequests(data.requests || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => {
    load();
    donorApi.getProfile()
      .then(d => setProfile(d.profile))
      .catch(() => {});
  }, []);

  return (
    <DonorLayout>
      <div className="page-content">
        <p className="page-tag">Blood Requests</p>
        <h1 className="page-title">Open Blood Requests 📋</h1>
        <p className="page-sub">All urgent blood requests from receivers. Respond to help.</p>

        <div className="section">
          <form onSubmit={e => { e.preventDefault(); load(); }} className="filter-form">
            <select value={filter.blood_group} onChange={e => setFilter(f => ({ ...f, blood_group: e.target.value }))} className="filter-select">
              <option value="">All Blood Groups</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={filter.urgency} onChange={e => setFilter(f => ({ ...f, urgency: e.target.value }))} className="filter-select">
              <option value="">All Urgency</option>
              <option value="Critical">🔴 Critical</option>
              <option value="High">🟠 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
            </select>
            <input value={filter.city} onChange={e => setFilter(f => ({ ...f, city: e.target.value }))} className="filter-input" placeholder="Filter by city..." />
            <button type="submit" className="filter-btn">Filter 🔍</button>
          </form>

          {loading && <div className="loading-text">Loading requests...</div>}
          {!loading && requests.length === 0 && <div className="empty-state"><p>🎉 No open requests at the moment.</p></div>}

          <div className="requests-list">
            {requests.map(req => {
              const compat = profile?.blood_group ? getCompatibilityDetails(profile.blood_group, req.blood_group) : null;
              const docImg = req.document_url
                ? (req.document_url.startsWith('http') ? req.document_url : `http://localhost:5000${req.document_url}`)
                : null;

              return (
                <div
                  key={req.id}
                  className="request-card"
                  onClick={() => setDecisionTarget(req)}
                  style={{
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                  title="Click anywhere on card to view full emergency details & document"
                >
                  <div className="request-left">
                    <span className="blood-badge">{req.blood_group}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <p className="request-hospital" style={{ margin: 0 }}>{req.hospital_name}</p>
                        {compat && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              background: compat.bg,
                              color: compat.color,
                              border: `1px solid ${compat.border}`,
                            }}
                            title={compat.description}
                          >
                            {compat.label}
                          </span>
                        )}
                      </div>
                      <p className="request-meta">📍 {req.city} · 🔢 {req.units_needed} unit(s)</p>
                      {req.additional_note && <p className="request-note">"{req.additional_note}"</p>}
                      <p className="request-receiver">By: {req.receiver_name} · 📞 {req.receiver_phone}</p>
                      <p className="request-meta" style={{ color:'#9ca3af' }}>{new Date(req.created_at).toLocaleString()}</p>

                      {/* Doctor Prescription / Document Attachment Preview Badge */}
                      {docImg && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setDecisionTarget(req);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 8,
                            padding: '4px 10px',
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                          title="Click to preview medical document"
                        >
                          {!docImg.toLowerCase().endsWith('.pdf') ? (
                            <img
                              src={docImg}
                              alt="Doc thumbnail"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 5,
                                objectFit: 'cover',
                                border: '1px solid #f87171',
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: 16 }}>📑</span>
                          )}
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#991b1b' }}>
                            🩺 Doctor Prescription Attached · Click to view image
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="request-right" onClick={e => e.stopPropagation()}>
                    <span className="urgency-badge" style={{ background: URGENCY_COLOR[req.urgency] + '20', color: URGENCY_COLOR[req.urgency] }}>{req.urgency}</span>
                    <div style={{ display:'flex', gap:6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setDecisionTarget(req)}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="View complete request details & hospital documents"
                      >
                        👁️ View Details & Doc
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareTarget(req)}
                        style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:8, padding:'6px 12px', fontSize:13, fontWeight:700, cursor:'pointer' }}
                      >
                        📢 Share
                      </button>
                      <button
                        type="button"
                        className="respond-btn"
                        onClick={() => setDecisionTarget(req)}
                      >
                        Respond 🩸
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 1-Click Share Modal */}
      <ShareRequestModal
        request={shareTarget}
        isOpen={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
      />

      {/* Emergency Decision Pop-up Modal */}
      <EmergencyDecisionModal
        request={decisionTarget}
        isOpen={Boolean(decisionTarget)}
        onClose={() => setDecisionTarget(null)}
        onAccepted={() => {
          setDecisionTarget(null);
          load();
        }}
      />
    </DonorLayout>
  );
}
