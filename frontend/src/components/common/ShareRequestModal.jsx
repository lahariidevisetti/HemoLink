// src/components/common/ShareRequestModal.jsx — 1-Click sharer for blood requests
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import './ShareRequestModal.css';

export default function ShareRequestModal({ request, isOpen, onClose }) {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !request) return null;

  const shareUrl = `${window.location.origin}/request/${request.id}`;
  const shareText = `🚨 URGENT: ${request.blood_group} Blood needed at ${request.hospital_name}, ${request.city} (${request.urgency} Urgency). Please help or share to save a life!`;

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    addToast({
      title: 'Link Copied! 📋',
      message: 'Shareable blood request link copied to clipboard. Anyone can view it without logging in.',
      type: 'success',
    });
    setTimeout(() => setCopied(false), 2500);
  }

  function handleNativeShare() {
    if (navigator.share) {
      navigator.share({
        title: `Urgent ${request.blood_group} Blood Needed`,
        text: shareText,
        url: shareUrl,
      }).catch(() => {});
    }
  }

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="srm-overlay" onClick={onClose}>
      <div className="srm-card" onClick={e => e.stopPropagation()}>
        <div className="srm-header">
          <h3 className="srm-title">
            <span>📢</span> Share Emergency Request
          </h3>
          <button className="srm-close" onClick={onClose}>✕</button>
        </div>

        <div className="srm-body">
          <div className="srm-preview">
            <div className="srm-blood-badge">{request.blood_group}</div>
            <div className="srm-preview-text">
              <p className="srm-preview-title">{request.hospital_name}</p>
              <p className="srm-preview-meta">
                📍 {request.city} · ⚡ {request.urgency} · 🔢 {request.units_needed} unit(s)
              </p>
            </div>
          </div>

          <div className="srm-copy-box">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="srm-copy-input"
              onClick={e => e.target.select()}
            />
            <button
              onClick={handleCopy}
              className={`srm-copy-btn ${copied ? 'srm-copy-btn--copied' : ''}`}
            >
              {copied ? '✓ Copied' : '📋 Copy Link'}
            </button>
          </div>

          <div className="srm-social-grid">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="srm-share-btn srm-btn-whatsapp"
            >
              <span>💬</span> Share to WhatsApp
            </a>

            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="srm-share-btn srm-btn-twitter"
            >
              <span>𝕏</span> Post on X
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="srm-share-btn srm-btn-telegram"
            >
              <span>✈️</span> Telegram
            </a>

            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                onClick={handleNativeShare}
                className="srm-share-btn srm-btn-native"
              >
                <span>📲</span> More Options (Native Share)
              </button>
            )}
          </div>

          <p className="srm-footer-note">
            💡 Anyone who receives this link can view the request without logging in.
            If they decide to donate, they can sign in or register to connect directly.
          </p>
        </div>
      </div>
    </div>
  );
}
