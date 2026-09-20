import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { publicApi, donorApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ShareRequestModal from '../../components/common/ShareRequestModal';
import EmergencyDecisionModal from '../../components/common/EmergencyDecisionModal';
import './PublicRequestView.css';

export default function PublicRequestView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [request, setRequest]                   = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState('');
  const [showShareModal, setShowShareModal]     = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [responded, setResponded]               = useState(false);

  // Fetch public request data
  const fetchRequest = useCallback(async () => {
    try {
      setLoading(true);
      const data = await publicApi.getRequestById(id);
      setRequest(data.request);
    } catch (err) {
      setError(err.message || 'Unable to load blood request.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Action Resumption: Detect ?action=review or ?action=donate after login/signup
  useEffect(() => {
    const action = searchParams.get('action');
    if ((action === 'donate' || action === 'review') && isAuthenticated && user) {
      if (user.role === 'donor') {
        setShowDecisionModal(true);
        addToast({
          title: 'Emergency Decision Modal Opened 🩸',
          message: 'Review patient clinical details, verified doctor document, and confirm your donation offer.',
          type: 'success',
        });
      } else {
        addToast({
          title: 'Receiver Account Detected 🏥',
          message: 'You are signed in as a Receiver. Blood donation offers can only be sent by registered Donors.',
          type: 'info',
        });
      }
    }
  }, [searchParams, isAuthenticated, user, addToast]);

  // Handle "I Want to Donate" button click
  function handleDonateClick() {
    if (!isAuthenticated) {
      sessionStorage.setItem('pending_intent', JSON.stringify({
        action: 'review',
        requestId: id,
        bloodGroup: request?.blood_group,
        hospital: request?.hospital_name,
      }));

      const returnUrl = `/request/${id}?action=review`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (user.role !== 'donor') {
      addToast({
        title: 'Donor Account Required',
        message: 'Only registered Donors can offer blood donations. You are logged in as a Receiver.',
        type: 'error',
      });
      return;
    }

    setShowDecisionModal(true);
  }


  if (loading) {
    return (
      <div className="prv-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🩸</div>
          <p style={{ color: '#f87171', fontWeight: 700 }}>Loading Emergency Blood Request...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="prv-container" style={{ alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="prv-card" style={{ maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: '#f87171', margin: '0 0 10px' }}>Request Not Found</h2>
          <p style={{ color: '#cbd5e1', marginBottom: 24 }}>
            {error || 'This blood request may have been fulfilled or cancelled.'}
          </p>
          <Link to="/" className="prv-nav-btn prv-nav-btn--primary">
            Return to HemoLink Home
          </Link>
        </div>
      </div>
    );
  }

  const urgencyClass = `prv-urgency--${request.urgency?.toLowerCase()}`;

  return (
    <div className="prv-container">
      {/* Top Navbar */}
      <header className="prv-navbar">
        <Link to="/" className="prv-brand">
          <span className="prv-logo-icon">🩸</span>
          <span className="prv-logo-text">Hemo<span className="prv-logo-accent">Link</span></span>
        </Link>

        <div className="prv-nav-actions">
          {isAuthenticated ? (
            <Link
              to={user.role === 'donor' ? '/donor/dashboard' : '/receiver/dashboard'}
              className="prv-nav-btn prv-nav-btn--primary"
            >
              Go to My Dashboard →
            </Link>
          ) : (
            <>
              <Link
                to={`/login?redirect=${encodeURIComponent(`/request/${id}?action=donate`)}`}
                className="prv-nav-btn prv-nav-btn--ghost"
              >
                Sign In
              </Link>
              <Link
                to={`/signup?role=donor&redirect=${encodeURIComponent(`/request/${id}?action=donate`)}`}
                className="prv-nav-btn prv-nav-btn--primary"
              >
                Register as Donor
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="prv-main">
        <div className="prv-emergency-badge">
          <span className="prv-pulse-dot" />
          <span>LIVE EMERGENCY BLOOD REQUEST</span>
        </div>

        <div className="prv-card">
          <div className="prv-card-header">
            <div className="prv-blood-hero">
              <div className="prv-blood-circle">
                <span className="prv-blood-type">{request.blood_group}</span>
                <span className="prv-blood-sub">Needed</span>
              </div>
              <div className="prv-header-meta">
                <h1>{request.hospital_name}</h1>
                <p className="prv-location">
                  <span>📍</span> {request.city}
                  {request.requester_address ? ` · ${request.requester_address}` : ''}
                </p>
              </div>
            </div>

            <span className={`prv-urgency-pill ${urgencyClass}`}>
              ⚡ {request.urgency}
            </span>
          </div>

          {/* Details Grid */}
          <div className="prv-grid">
            <div className="prv-stat-box">
              <p className="prv-stat-title">Units Needed</p>
              <p className="prv-stat-value">🔢 {request.units_needed} Unit(s)</p>
            </div>
            <div className="prv-stat-box">
              <p className="prv-stat-title">Status</p>
              <p className="prv-stat-value" style={{ color: request.status === 'Open' ? '#4ade80' : '#f87171' }}>
                ● {request.status}
              </p>
            </div>
            <div className="prv-stat-box">
              <p className="prv-stat-title">Donor Responses</p>
              <p className="prv-stat-value">💬 {request.response_count || 0} Offered</p>
            </div>
          </div>

          {/* Medical Context / Notes */}
          {request.additional_note && (
            <div className="prv-note-box">
              <p className="prv-note-label">Patient / Medical Note</p>
              <p className="prv-note-text">"{request.additional_note}"</p>
            </div>
          )}

          {/* Verified Doctor Document if available */}
          {request.document_url && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 18px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 14,
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 26 }}>📄</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>
                    Verified Doctor Prescription / Surgery Slip
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    Medical authenticity document attached to this emergency request
                  </div>
                </div>
              </div>
              <a
                href={request.document_url.startsWith('http') ? request.document_url : `http://localhost:5000${request.document_url}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                }}
              >
                👁️ View Document
              </a>
            </div>
          )}

          {/* Requester Info */}
          <div style={{ padding: '0 0 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 4px' }}>
              Requested by: <strong style={{ color: '#fff' }}>{request.requester_name}</strong>
              {request.requester_phone ? ` · 📞 ${request.requester_phone}` : ''}
            </p>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              Posted on {new Date(request.created_at).toLocaleString()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="prv-actions">
            {responded ? (
              <div style={{ padding: '14px 18px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: 14, textAlign: 'center', color: '#6ee7b7', fontWeight: 700 }}>
                ✓ Thank you! Your donation response has been recorded.
              </div>
            ) : (
              request.status === 'Open' && (
                <button
                  className="prv-btn-donate"
                  onClick={handleDonateClick}
                >
                  <span>🩸</span> I Want to Donate / Respond to Save Life
                </button>
              )
            )}

            <button
              className="prv-btn-share"
              onClick={() => setShowShareModal(true)}
            >
              <span>📢</span> Share Request to Save a Life (WhatsApp / Social)
            </button>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      <ShareRequestModal
        request={request}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* Emergency Decision Pop-up Modal */}
      <EmergencyDecisionModal
        request={request}
        isOpen={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        onAccepted={() => {
          setResponded(true);
          setShowDecisionModal(false);
          setRequest(prev => prev ? { ...prev, response_count: (parseInt(prev.response_count) || 0) + 1 } : prev);
        }}
      />
    </div>
  );
}
