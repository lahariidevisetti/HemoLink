import { useState, useEffect } from 'react';
import { donorApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getCompatibilityDetails } from '../../utils/bloodCompatibility';
import './EmergencyDecisionModal.css';

export default function EmergencyDecisionModal({ request, isOpen, onClose, onAccepted }) {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [message, setMessage]       = useState('I can donate blood. Reaching hospital soon.');
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted]     = useState(false);
  const [docUrl, setDocUrl]         = useState(request?.document_url || null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [donorProfile, setDonorProfile] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLightboxOpen(false);
      setAccepted(false);
      return;
    }

    if (request?.document_url) {
      setDocUrl(request.document_url);
    } else if (request?.id) {
      // Call endpoint to get fresh request details including document_url
      setLoadingDoc(true);
      donorApi.getRequestById(request.id)
        .then(data => {
          setDocUrl(data.request?.document_url || null);
        })
        .catch(() => setDocUrl(null))
        .finally(() => setLoadingDoc(false));
    } else {
      setDocUrl(null);
    }

    if (isAuthenticated && user?.role === 'donor' && !donorProfile) {
      donorApi.getProfile()
        .then(d => setDonorProfile(d.profile))
        .catch(() => {});
    }
  }, [request, isOpen, isAuthenticated, user]);

  if (!isOpen || !request) return null;

  const fullImageUrl = docUrl
    ? (docUrl.startsWith('http') ? docUrl : `http://localhost:5000${docUrl}`)
    : null;

  async function handleAccept(e) {
    e.preventDefault();

    if (!isAuthenticated || user?.role !== 'donor') {
      addToast({
        title: 'Sign In Required',
        message: 'Please sign in with a Donor account to confirm your blood donation.',
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      await donorApi.respondToRequest(request.id, { message: message.trim() });
      setAccepted(true);
      addToast({
        title: '🎉 Donation Offer Accepted & Dispatched!',
        message: 'The requester and hospital have been notified via live email with your contact details.',
        type: 'success',
      });
      if (onAccepted) onAccepted();
    } catch (err) {
      addToast({
        title: 'Response Failed',
        message: err.message || 'You may have already responded to this request.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDecline() {
    addToast({
      title: 'Request Declined',
      message: 'Thank you for your consideration. You can always respond to other emergencies near you.',
      type: 'info',
    });
    onClose();
  }

  return (
    <div className="edm-overlay" onClick={onClose}>
      <div className="edm-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="edm-header">
          <div className="edm-header-left">
            <div className="edm-blood-circle">
              {request.blood_group}
            </div>
            <div className="edm-title-group">
              <h2>Emergency Blood Request Details 📋</h2>
              <p>📍 {request.hospital_name} ({request.city})</p>
            </div>
          </div>
          <button className="edm-close" onClick={onClose} title="Close">✕</button>
        </div>

        {/* Body */}
        <div className="edm-body">
          {/* Info Grid */}
          <div className="edm-info-grid">
            <div className="edm-info-box">
              <p className="edm-info-label">Urgency Level</p>
              <p className="edm-info-value" style={{ color: '#dc2626' }}>
                ⚡ {request.urgency} Priority
              </p>
            </div>
            <div className="edm-info-box">
              <p className="edm-info-label">Units Needed</p>
              <p className="edm-info-value">
                🔢 {request.units_needed} Unit(s) of Blood
              </p>
            </div>
            <div className="edm-info-box">
              <p className="edm-info-label">Patient / Requester</p>
              <p className="edm-info-value">
                👤 {request.requester_name || request.receiver_name || 'Patient in Need'}
              </p>
            </div>
            <div className="edm-info-box">
              <p className="edm-info-label">Contact Phone</p>
              <p className="edm-info-value">
                📞 {request.requester_phone || request.receiver_phone || 'Shared upon acceptance'}
              </p>
            </div>
          </div>

          {/* Donor Compatibility Advisory */}
          {donorProfile?.blood_group && (() => {
            const compat = getCompatibilityDetails(donorProfile.blood_group, request.blood_group);
            if (!compat) return null;
            return (
              <div style={{
                margin: '14px 0',
                padding: '12px 14px',
                borderRadius: 10,
                background: compat.bg,
                border: `1.5px solid ${compat.border}`,
                color: compat.color,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 13,
                fontWeight: 600,
              }}>
                <span style={{ fontSize: 22 }}>🩸</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13.5 }}>
                    {compat.label} (Your Group: {donorProfile.blood_group})
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2, fontWeight: 500 }}>
                    {compat.description}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Clinical Note */}
          {request.additional_note && (
            <div className="edm-clinical-note">
              <p className="edm-note-title">Special Clinical Notes / Diagnosis</p>
              <p className="edm-note-body">"{request.additional_note}"</p>
            </div>
          )}

          {/* Verified Doctor Prescription / Surgery Image */}
          {fullImageUrl ? (
            <div style={{
              margin: '16px 0 20px',
              padding: '14px',
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              borderRadius: 14,
              boxShadow: '0 2px 10px rgba(220, 38, 38, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🩺</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#991b1b' }}>
                      Verified Doctor Prescription / Surgery Document
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#b91c1c' }}>
                      Hospital verified clinical authentication document (Click to zoom)
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#991b1b',
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      padding: '5px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    🔍 Zoom
                  </button>
                  <a
                    href={fullImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#dc2626',
                      textDecoration: 'none',
                      background: '#ffffff',
                      padding: '5px 12px',
                      borderRadius: 8,
                      border: '1px solid #fca5a5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    ↗ Open Original
                  </a>
                </div>
              </div>

              {/* Scaled Image Display */}
              <div
                style={{
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  background: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  maxHeight: 250,
                  cursor: 'zoom-in',
                }}
                onClick={() => setLightboxOpen(true)}
                title="Click to view enlarged full image"
              >
                {fullImageUrl.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={fullImageUrl}
                    style={{ width: '100%', height: 250, border: 'none' }}
                    title="Doctor Prescription Document"
                  />
                ) : (
                  <img
                    src={fullImageUrl}
                    alt="Doctor Prescription / Hospital Document"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 250,
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                )}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#7f1d1d', textAlign: 'center' }}>
                💡 Click image or Zoom button to inspect in full resolution
              </p>
            </div>
          ) : (
            <div style={{
              margin: '16px 0 20px',
              padding: '14px',
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: 26 }}>🏥</span>
              <div>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                  Hospital Verified Emergency Requirement
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  This request is placed and authenticated by {request.receiver_name || request.requester_name || 'verified hospital receiver'} at {request.hospital_name}.
                </p>
              </div>
            </div>
          )}

          {/* Accept / Decline Section */}
          {accepted ? (
            <div className="edm-responded-banner">
              <p style={{ margin: '0 0 6px', fontSize: 16 }}>🎉 Thank You, Life Saver!</p>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
                Your donation offer has been confirmed. The requester has been emailed with your contact details. Please reach {request.hospital_name} as planned.
              </p>
              <button
                onClick={onClose}
                style={{ marginTop: 14, background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', fontWeight: 700, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleAccept}>
              <div className="edm-response-section">
                <p className="edm-response-title">
                  💬 Your Note / Estimated Arrival Time
                </p>
                <textarea
                  className="edm-textarea"
                  rows={2}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. I have AB+ blood and can arrive at the hospital within 1 hour."
                  required
                />
              </div>

              <div className="edm-actions">
                <button
                  type="submit"
                  disabled={submitting}
                  className="edm-btn-accept"
                >
                  <span>✅</span> {submitting ? 'Confirming Offer...' : 'Accept & Donate Blood 🩸'}
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  className="edm-btn-decline"
                  disabled={submitting}
                >
                  <span>❌</span> Decline
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Zoom Modal */}
      {lightboxOpen && fullImageUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              display: 'flex',
              gap: 12,
              zIndex: 2010,
            }}
            onClick={e => e.stopPropagation()}
          >
            <a
              href={fullImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#ffffff',
                color: '#111827',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              ↗ Open in New Tab
            </a>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              ✕ Close
            </button>
          </div>
          <div
            style={{ maxWidth: '92vw', maxHeight: '86vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={fullImageUrl}
              alt="Prescription Full Resolution"
              style={{
                maxWidth: '100%',
                maxHeight: '86vh',
                objectFit: 'contain',
                borderRadius: 10,
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
