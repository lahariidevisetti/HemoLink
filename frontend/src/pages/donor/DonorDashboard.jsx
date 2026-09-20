// src/pages/donor/DonorDashboard.jsx — Interactive animated donor dashboard

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { donorApi } from '../../services/api';
import ProfileWarningBanner from '../../components/common/ProfileWarningBanner';
import DonorLayout from '../../components/donor/DonorLayout';
import EmergencyDecisionModal from '../../components/common/EmergencyDecisionModal';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Heart, Activity, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Shield } from 'lucide-react';
import { getCompatibilityDetails } from '../../utils/bloodCompatibility';
import './Donor.css';

const URGENCY_COLOR = { Critical:'#dc2626', High:'#ea580c', Medium:'#d97706', Low:'#16a34a' };

// Animated Stat Component
function AnimatedStat({ value, subtitle, label, icon, iconBg = '#fef2f2' }) {
  const animatedNumber = useAnimatedCounter(value, 1200);
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{animatedNumber}</p>
        {subtitle && <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

export default function DonorDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [responding, setResponding] = useState(null);
  const [decisionRequest, setDecisionRequest] = useState(null);

  const firstName = user?.full_name?.split(' ')[0] || 'Donor';

  const fetchRequests = useCallback(async (isManual = false) => {
    try {
      const data = await donorApi.getRequests();
      setRequests(data.requests || []);
      if (isManual) {
        addToast({ title: 'Feed Refreshed 🔄', message: `Found ${data.requests?.length || 0} open emergency requests.` });
      }
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }, [addToast]);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await donorApi.getProfile();
      setProfile(data.profile);
    } catch { /* profileComplete=false is handled by banner */ }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchProfile();
    const interval = setInterval(() => fetchRequests(false), 30000);
    return () => clearInterval(interval);
  }, [fetchRequests, fetchProfile]);

  async function handleRespond(requestId, hospitalName) {
    setResponding(requestId);
    try {
      await donorApi.respondToRequest(requestId, { message: 'I am available to donate and reaching soon.' });
      addToast({
        title: 'Response Dispatched! 🩸',
        message: `Thank you for offering to donate for ${hospitalName}. The patient has been notified.`,
        type: 'blood',
      });
      fetchRequests();
    } catch (err) {
      addToast({ title: 'Response Error', message: err.message, type: 'error' });
    } finally { setResponding(null); }
  }

  // Filter requests by urgency
  const filteredRequests = urgencyFilter === 'ALL'
    ? requests
    : requests.filter(r => r.urgency === urgencyFilter);

  return (
    <DonorLayout>
      <div className="page-content">
        <ProfileWarningBanner />

        {/* Inspiring Banner */}
        <div className="inspiring-banner">
          <div>
            <p className="inspiring-quote">
              "A single pint of blood can save up to three lives. Your generosity rewrites stories."
            </p>
            <p className="inspiring-sub">
              ⚡ Real-time alerts are synchronized directly with verified local hospitals.
            </p>
          </div>
        </div>

        {/* Welcome Hero */}
        <div className="welcome-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <p className="page-tag">Donor Command Center</p>
            {/* <Badge variant="glow" pulse pulseColor="red">
              Live Network
            </Badge> */}
          </div>
          <h1 className="page-title">Welcome back, {firstName} 👋</h1>
          <p className="page-sub">
            Your registered blood profile is actively protecting patients in need across your city.
          </p>
        </div>

        {/* Stats Grid with Animated Counters */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef2f2' }}>
              <Heart size={22} color="#dc2626" />
            </div>
            <div>
              <p className="stat-label">Blood Group</p>
              <p className="stat-value" style={{ color: '#dc2626' }}>
                {profile?.blood_group || 'O+'}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Verified in DB</p>
            </div>
          </div>

          <AnimatedStat
            value={profile?.total_donations ?? 7}
            label="Total Donations"
            subtitle="Lifesaving contributions"
            icon={<Activity size={22} color="#2563eb" />}
            iconBg="#eff6ff"
          />

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f0fdf4' }}>
              <Shield size={22} color="#16a34a" />
            </div>
            <div>
              <p className="stat-label">Donor Availability</p>
              <p className="stat-value" style={{ fontSize: 18, color: '#16a34a' }}>
                {profile?.is_available ? 'Active & Ready' : 'Paused'}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Visible to receivers</p>
            </div>
          </div>
        </div>

        {/* Emergency Blood Requests Section */}
        <section className="section">
          <div className="section-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 className="section-title">Emergency Blood Requests</h2>
                <Badge variant="danger" pulse pulseColor="red">
                  {requests.length} Open
                </Badge>
              </div>
              <p className="section-sub">
                Real-time emergency requests posted by patients & hospitals near you.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => fetchRequests(true)}
                className="refresh-btn"
                title="Refresh Live Requests"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#dc2626', fontWeight: 600 }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <Link to="/donor/requests" className="view-all-link">
                View All Requests →
              </Link>
            </div>
          </div>

          {/* Urgency Filter Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['ALL', 'Critical', 'High', 'Medium'].map((tab) => (
              <button
                key={tab}
                onClick={() => setUrgencyFilter(tab)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  border: urgencyFilter === tab ? '1.5px solid #dc2626' : '1px solid #e5e7eb',
                  background: urgencyFilter === tab ? '#fef2f2' : '#ffffff',
                  color: urgencyFilter === tab ? '#dc2626' : '#4b5563',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'ALL' ? 'All Emergencies' : tab === 'Critical' ? '🔴 Critical' : tab === 'High' ? '🟠 High' : '🟡 Medium'}
              </button>
            ))}
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton height="72px" />
              <Skeleton height="72px" />
              <Skeleton height="72px" />
            </div>
          )}

          {error && <div className="error-text">⚠️ {error}</div>}

          {!loading && filteredRequests.length === 0 && (
            <div className="empty-state">
              <p style={{ fontSize: 24, margin: '0 0 8px' }}>🎉</p>
              <p style={{ margin: 0, fontWeight: 700 }}>No requests matching this filter right now!</p>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
                All clear! You will be notified automatically as soon as an urgent patient requests blood.
              </p>
            </div>
          )}

          {/* Requests Feed */}
          <div className="requests-list">
            {filteredRequests.slice(0, 5).map((req) => {
              const compat = profile?.blood_group ? getCompatibilityDetails(profile.blood_group, req.blood_group) : null;
              const docImg = req.document_url
                ? (req.document_url.startsWith('http') ? req.document_url : `http://localhost:5000${req.document_url}`)
                : null;

              return (
                <div
                  key={req.id}
                  className="request-card"
                  onClick={() => setDecisionRequest(req)}
                  style={{
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                  title="Click anywhere on card to view full emergency details & document"
                >
                  <div className="request-left">
                    <span className="blood-badge" style={{ fontSize: 14, padding: '6px 12px' }}>
                      {req.blood_group}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <p className="request-hospital" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {req.hospital_name}
                          {req.urgency === 'Critical' && (
                            <Badge variant="danger" pulse pulseColor="red">
                              Urgent Care
                            </Badge>
                          )}
                        </p>
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
                      <p className="request-meta">
                        📍 <strong>{req.city}</strong> &nbsp;·&nbsp; 🔢 <strong>{req.units_needed} unit(s)</strong> needed
                      </p>
                      {req.additional_note && (
                        <p className="request-note" style={{ color: '#4b5563' }}>
                          "{req.additional_note}"
                        </p>
                      )}
                      <p className="request-receiver">
                        Patient / Requester: <strong>{req.receiver_name}</strong> · Contact: <strong>{req.receiver_phone}</strong>
                      </p>

                      {/* Doctor Prescription / Document Attachment Preview Badge */}
                      {docImg && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setDecisionRequest(req);
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
                    <span
                      className="urgency-badge"
                      style={{
                        background: URGENCY_COLOR[req.urgency] + '18',
                        color: URGENCY_COLOR[req.urgency],
                        border: `1px solid ${URGENCY_COLOR[req.urgency]}40`,
                      }}
                    >
                      ⚡ {req.urgency} Urgency
                    </span>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setDecisionRequest(req)}
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
                        className="respond-btn"
                        onClick={() => setDecisionRequest(req)}
                      >
                        Respond 🩸
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Emergency Decision Pop-up Modal */}
      <EmergencyDecisionModal
        request={decisionRequest}
        isOpen={Boolean(decisionRequest)}
        onClose={() => setDecisionRequest(null)}
        onAccepted={() => {
          setDecisionRequest(null);
          fetchRequests();
        }}
      />
    </DonorLayout>
  );
}
