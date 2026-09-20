// src/components/common/IncomingDonorAlertsStack.jsx
// Displays real-time incoming donor responses as a top stacked deck with direct contact action

import { useState, useEffect, useCallback } from 'react';
import { receiverApi } from '../../services/api';
import { Badge } from '../ui/Badge';
import { Phone, MessageSquare, MapPin, Hospital, Clock, ChevronLeft, ChevronRight, CheckCircle2, HeartHandshake, UserCheck } from 'lucide-react';
import './IncomingDonorAlertsStack.css';

export default function IncomingDonorAlertsStack() {
  const [responses, setResponses] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hemolink_dismissed_responses') || '[]');
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchResponses = useCallback(async () => {
    try {
      const data = await receiverApi.getIncomingResponses();
      setResponses(data.responses || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResponses();
    // Poll every 15 seconds for incoming donor responses
    const interval = setInterval(fetchResponses, 15000);
    return () => clearInterval(interval);
  }, [fetchResponses]);

  // Filter out any dismissed by the user in this session
  const activeResponses = responses.filter(r => !dismissedIds.includes(r.id));

  if (loading || activeResponses.length === 0) {
    return null; // Nothing to show if no incoming donor responses
  }

  // Ensure index stays in bounds
  const current = activeResponses[Math.min(currentIndex, activeResponses.length - 1)];

  function dismissCurrent(id) {
    const nextDismissed = [...dismissedIds, id];
    setDismissedIds(nextDismissed);
    localStorage.setItem('hemolink_dismissed_responses', JSON.stringify(nextDismissed));
    if (currentIndex >= activeResponses.length - 1 && currentIndex > 0) {
      setCurrentIndex(c => c - 1);
    }
  }

  const cleanPhone = current.donor_phone ? current.donor_phone.replace(/[^0-9]/g, '') : '';

  return (
    <div className="donor-stack-wrapper">
      {/* Stack Header */}
      <div className="donor-stack-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="pulse-dot pulse-dot--red" />
          <p className="donor-stack-title">
            Incoming Donor Responses ({activeResponses.length} Ready to Donate)
          </p>
          <Badge variant="glow" pulse pulseColor="green">
            Live Match
          </Badge>
        </div>

        {activeResponses.length > 1 && (
          <div className="donor-stack-nav">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
              {currentIndex + 1} of {activeResponses.length}
            </span>
            <button
              type="button"
              className="donor-stack-nav-btn"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(i => i - 1)}
              title="Previous donor"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="donor-stack-nav-btn"
              disabled={currentIndex >= activeResponses.length - 1}
              onClick={() => setCurrentIndex(i => i + 1)}
              title="Next donor"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main Stack Card */}
      <div className="donor-stack-card">
        <div className="donor-stack-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="donor-stack-avatar">
              {current.donor_name ? current.donor_name.charAt(0).toUpperCase() : 'D'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 className="donor-stack-name">{current.donor_name}</h4>
                <Badge variant="primary" style={{ fontSize: 12, fontWeight: 800 }}>
                  {current.donor_blood_group || current.requested_blood_group}
                </Badge>
              </div>
              <p className="donor-stack-subtitle">
                <MapPin size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {current.donor_city || current.request_city}
                {current.total_donations > 0 && ` · ${current.total_donations} Previous Donations`}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p className="donor-stack-hospital">
              <Hospital size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {current.hospital_name}
            </p>
            <p className="donor-stack-time">
              <Clock size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {new Date(current.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Donor message */}
        {current.message && (
          <div className="donor-stack-msg">
            <HeartHandshake size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0 }}>"{current.message}"</p>
          </div>
        )}

        {/* Action Buttons: Direct Call & WhatsApp */}
        <div className="donor-stack-actions">
          {cleanPhone && (
            <>
              <a
                href={`tel:${cleanPhone}`}
                className="donor-stack-btn donor-stack-btn--call"
                title={`Call ${current.donor_name}`}
              >
                <Phone size={15} /> Call Donor ({current.donor_phone})
              </a>

              <a
                href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${current.donor_name}, thank you for responding to my HemoLink blood request for ${current.hospital_name}!`)}`}
                target="_blank"
                rel="noreferrer"
                className="donor-stack-btn donor-stack-btn--chat"
                title="Chat on WhatsApp"
              >
                <MessageSquare size={15} /> WhatsApp
              </a>
            </>
          )}

          <button
            type="button"
            className="donor-stack-btn donor-stack-btn--done"
            onClick={() => dismissCurrent(current.id)}
            title="Mark as contacted"
          >
            <CheckCircle2 size={15} /> Contacted ✓
          </button>
        </div>
      </div>

      {/* Decorative stacked shadow cards underneath */}
      {activeResponses.length > 1 && (
        <div className="donor-stack-shadow-layer" />
      )}
    </div>
  );
}
