// src/pages/receiver/MyRequests.jsx — Track blood requests, view responded donors, and broadcast to matching donors
import { useState, useEffect } from 'react';
import { receiverApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import IncomingDonorAlertsStack from '../../components/common/IncomingDonorAlertsStack';
import ShareRequestModal from '../../components/common/ShareRequestModal';
import ReceiverLayout from '../../components/receiver/ReceiverLayout';
import { getCompatibilityDetails } from '../../utils/bloodCompatibility';
import '../donor/Donor.css';

export default function MyRequests() {
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [shareTarget, setShareTarget] = useState(null);

  // Accordion state per request: { [requestId]: { type: 'responses' | 'matching', data: [...], loading: bool } }
  const [expandedSection, setExpandedSection] = useState({});
  const [sendingBroadcast, setSendingBroadcast] = useState(null);
  const [sendingEmail, setSendingEmail] = useState({});

  async function load() {
    try {
      const data = await receiverApi.getMyRequests();
      setRequests(data.requests || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCancel(id) {
    if (!window.confirm('Cancel this blood request?')) return;
    try {
      await receiverApi.deleteRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      addToast({ title: 'Request Cancelled', message: 'The blood request has been removed.', type: 'info' });
    } catch (err) {
      addToast({ title: 'Cancel Failed', message: err.message, type: 'error' });
    }
  }

  // Toggle Responded Donors Accordion
  async function toggleResponses(reqId) {
    if (expandedSection[reqId]?.type === 'responses') {
      setExpandedSection(prev => ({ ...prev, [reqId]: null }));
      return;
    }

    setExpandedSection(prev => ({
      ...prev,
      [reqId]: { type: 'responses', loading: true, data: [] },
    }));

    try {
      const data = await receiverApi.getRequestResponses(reqId);
      setExpandedSection(prev => ({
        ...prev,
        [reqId]: { type: 'responses', loading: false, data: data.responses || [] },
      }));
    } catch (err) {
      addToast({ title: 'Error Loading Responses', message: err.message, type: 'error' });
      setExpandedSection(prev => ({ ...prev, [reqId]: null }));
    }
  }

  // Toggle Matching Donors Dropdown
  async function toggleMatchingDonors(reqId) {
    if (expandedSection[reqId]?.type === 'matching') {
      setExpandedSection(prev => ({ ...prev, [reqId]: null }));
      return;
    }

    setExpandedSection(prev => ({
      ...prev,
      [reqId]: { type: 'matching', loading: true, data: [] },
    }));

    try {
      const data = await receiverApi.getMatchingDonors(reqId);
      setExpandedSection(prev => ({
        ...prev,
        [reqId]: {
          type: 'matching',
          loading: false,
          data: data.matchingDonors || [],
          eligibleGroups: data.eligibleGroups || [data.request?.blood_group],
        },
      }));
    } catch (err) {
      addToast({ title: 'Error Loading Donors', message: err.message, type: 'error' });
      setExpandedSection(prev => ({ ...prev, [reqId]: null }));
    }
  }

  // Send Email to All Matching Donors
  async function handleSendAllEmail(reqId, donorCount) {
    setSendingBroadcast(reqId);
    try {
      const result = await receiverApi.broadcastEmail(reqId);
      addToast({
        title: 'Emergency Broadcast Sent! ✉️',
        message: result.message || `Alert emails dispatched to ${donorCount} matching donor(s).`,
        type: 'success',
      });
    } catch (err) {
      addToast({ title: 'Broadcast Failed', message: err.message, type: 'error' });
    } finally {
      setSendingBroadcast(null);
    }
  }

  // Send Direct Email to a Specific Donor
  async function handleSendDirectEmail(reqId, donor) {
    const donorId = donor.donor_id || donor.id;
    const donorName = donor.donor_name || donor.full_name || 'Donor';
    if (!donorId) {
      addToast({ title: 'Donor Info Missing', message: 'Unable to identify donor ID.', type: 'error' });
      return;
    }

    const key = donor.id || donorId;
    setSendingEmail(prev => ({ ...prev, [key]: true }));
    try {
      const result = await receiverApi.emailDonor(reqId, donorId);
      addToast({
        title: 'Direct Email Sent! ✉️',
        message: result.message || `Official blood coordination email sent directly to ${donorName}.`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Email Failed',
        message: err.message || 'Could not send direct email.',
        type: 'error',
      });
    } finally {
      setSendingEmail(prev => ({ ...prev, [key]: false }));
    }
  }

  return (
    <ReceiverLayout>
      <div className="page-content">
        {/* Real-Time Incoming Donor Responses Stack at Top */}
        <IncomingDonorAlertsStack />

        <p className="page-tag">My Requests</p>
        <h1 className="page-title">Blood Requests 📋</h1>
        <p className="page-sub">Track the status of your blood requests, view responding donors, and broadcast to matching donors.</p>

        {loading && <div className="loading-text">Loading your requests...</div>}
        {!loading && requests.length === 0 && (
          <div className="empty-state">
            <p>📋 You haven't made any blood requests yet.</p>
          </div>
        )}

        <div className="requests-list">
          {requests.map(req => {
            const activeSection = expandedSection[req.id];

            return (
              <div key={req.id} style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                {/* Main Request Summary Card */}
                <div className="request-card" style={{ border: 'none', borderRadius: 0, margin: 0, alignItems: 'flex-start' }}>
                  <div className="request-left">
                    <span className="blood-badge">{req.blood_group}</span>
                    <div>
                      <p className="request-hospital">{req.hospital_name}</p>
                      <p className="request-meta">📍 {req.city} · 🔢 {req.units_needed} unit(s) · ⚡ {req.urgency}</p>
                      
                      {/* Doctor Document Link if available */}
                      {req.document_url && (
                        <p style={{ margin: '4px 0 6px', fontSize: 12 }}>
                          <a
                            href={req.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#059669', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <span>🩺</span> Verified Doctor Prescription Attached ↗
                          </a>
                        </p>
                      )}

                      {req.additional_note && <p className="request-note">"{req.additional_note}"</p>}
                      <p className="request-meta" style={{ color: '#9ca3af' }}>
                        Created: {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span className={`status-badge status-${req.status.toLowerCase()}`}>{req.status}</span>
                    
                    {/* Share Button */}
                    <button
                      onClick={() => setShareTarget(req)}
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      📢 Share
                    </button>

                    {/* Cancel button */}
                    {req.status === 'Open' && (
                      <button
                        onClick={() => handleCancel(req.id)}
                        style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-Action Toolbar under request */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: activeSection ? '1px solid #e2e8f0' : 'none' }}>
                  {/* View Donor Responses Button */}
                  <button
                    onClick={() => toggleResponses(req.id)}
                    style={{
                      background: activeSection?.type === 'responses' ? '#dc2626' : '#ffffff',
                      color: activeSection?.type === 'responses' ? '#ffffff' : '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>💬</span>
                    <span>
                      {req.response_count > 0
                        ? `View ${req.response_count} Donor Response${req.response_count > 1 ? 's' : ''}`
                        : 'No Donor Responses Yet'}
                    </span>
                  </button>

                  {/* Matching Donors Dropdown Button */}
                  <button
                    onClick={() => toggleMatchingDonors(req.id)}
                    style={{
                      background: activeSection?.type === 'matching' ? '#991b1b' : '#ffffff',
                      color: activeSection?.type === 'matching' ? '#ffffff' : '#dc2626',
                      border: activeSection?.type === 'matching' ? '1px solid #991b1b' : '1px solid #fca5a5',
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>👥</span>
                    <span>Matching & Compatible Donors ({req.blood_group}) ▾</span>
                  </button>
                </div>

                {/* Expandable Section 1: Donor Responses Details */}
                {activeSection?.type === 'responses' && (
                  <div style={{ padding: '16px 20px', background: '#ffffff', animation: 'fadeIn 0.2s ease-out' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#1f2937' }}>
                      📋 Responded Donors for this Broadcast:
                    </h4>

                    {activeSection.loading ? (
                      <p style={{ fontSize: 13, color: '#6b7280' }}>Loading responses...</p>
                    ) : activeSection.data.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
                        No donors have submitted a response to this request yet. Use "Matching Donors" to send an email alert!
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activeSection.data.map(resp => (
                          <div
                            key={resp.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              background: '#f0fdf4',
                              border: '1px solid #86efac',
                              borderRadius: 12,
                              gap: 12,
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <strong style={{ fontSize: 14, color: '#166534' }}>{resp.donor_name}</strong>
                                <span style={{ background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 800, padding: '1px 8px', border_radius: 6 }}>
                                  {resp.blood_group}
                                </span>
                                <span style={{ fontSize: 12, color: '#4b5563' }}>📍 {resp.city}</span>
                              </div>
                              {resp.message && (
                                <p style={{ margin: '2px 0 4px', fontSize: 12, color: '#14532d', fontStyle: 'italic' }}>
                                  "{resp.message}"
                                </p>
                              )}
                              <p style={{ margin: 0, fontSize: 11, color: '#15803d' }}>
                                Responded: {new Date(resp.responded_at).toLocaleString()}
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                              <a
                                href={`tel:${resp.phone}`}
                                style={{
                                  background: '#16a34a',
                                  color: '#fff',
                                  padding: '7px 12px',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                📞 Call
                              </a>
                              <a
                                href={`https://wa.me/${resp.phone?.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  background: '#25d366',
                                  color: '#fff',
                                  padding: '7px 12px',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                💬 WhatsApp
                              </a>
                              <button
                                onClick={() => handleSendDirectEmail(req.id, resp)}
                                disabled={sendingEmail[resp.id]}
                                style={{
                                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '7px 12px',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                                }}
                                title={`Send direct coordination email to ${resp.donor_name}`}
                              >
                                {sendingEmail[resp.id] ? '✉️ Sending...' : '✉️ Email'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Expandable Section 2: Matching Donors Dropdown with "Send All" Button */}
                {activeSection?.type === 'matching' && (
                  <div style={{ padding: '18px 20px', background: '#fff7ed', borderTop: '1px solid #fed7aa', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#9a3412' }}>
                          👥 Medically Compatible Donors for {req.blood_group}
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#c2410c' }}>
                          Eligible donor groups: <strong>{activeSection.eligibleGroups?.join(', ') || req.blood_group}</strong> (Medically safe red blood cell donors for {req.blood_group} patients)
                        </p>
                      </div>

                      {/* Send All Button */}
                      {activeSection.data?.length > 0 && (
                        <button
                          onClick={() => handleSendAllEmail(req.id, activeSection.data.length)}
                          disabled={sendingBroadcast === req.id}
                          style={{
                            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '9px 18px',
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                          }}
                        >
                          {sendingBroadcast === req.id ? 'Sending Broadcast...' : `✉️ Send All (${activeSection.data.length} Compatible Donors)`}
                        </button>
                      )}
                    </div>

                    {activeSection.loading ? (
                      <p style={{ fontSize: 13, color: '#9a3412' }}>Searching for active {req.blood_group} & compatible donors...</p>
                    ) : activeSection.data.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#9a3412', margin: 0 }}>
                        No active donors found in database with compatible blood groups ({activeSection.eligibleGroups?.join(', ') || req.blood_group}) yet. You can share the public link on WhatsApp!
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                        {activeSection.data.map(donor => {
                          const compat = getCompatibilityDetails(donor.blood_group, req.blood_group);
                          return (
                            <div
                              key={donor.id}
                              style={{
                                background: '#ffffff',
                                border: donor.has_responded ? '1.5px solid #86efac' : '1px solid #fed7aa',
                                borderRadius: 10,
                                padding: '12px 14px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                <strong style={{ fontSize: 13, color: '#1e293b' }}>{donor.full_name}</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                                    {donor.blood_group}
                                  </span>
                                  {compat && (
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: compat.bg,
                                      color: compat.color,
                                      border: `1px solid ${compat.border}`,
                                    }}>
                                      {compat.label}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#64748b' }}>📍 {donor.city} {donor.state ? `(${donor.state})` : ''}</p>
                              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b' }}>📞 {donor.phone}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1px dashed #f1f5f9' }}>
                                <span style={{ fontSize: 11, color: '#94a3b8' }}>Donations: {donor.total_donations || 0}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {donor.has_responded ? (
                                    <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓ Responded</span>
                                  ) : (
                                    <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>● Active</span>
                                  )}
                                  <button
                                    onClick={() => handleSendDirectEmail(req.id, donor)}
                                    disabled={sendingEmail[donor.id]}
                                    style={{
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      color: '#1d4ed8',
                                      borderRadius: 6,
                                      padding: '3px 8px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                    title={`Send direct email to ${donor.full_name}`}
                                  >
                                    {sendingEmail[donor.id] ? 'Sending...' : '✉️ Email'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 1-Click Share Modal */}
      <ShareRequestModal
        request={shareTarget}
        isOpen={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
      />
    </ReceiverLayout>
  );
}
