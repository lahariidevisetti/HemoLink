// src/components/common/ProfileWarningBanner.jsx
// Warning banner shown when user hasn't completed their profile yet
// Disappears automatically after profile is saved

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ExtraDetailsModal from './ExtraDetailsModal';

export default function ProfileWarningBanner() {
  const { profileComplete, isDonor } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (profileComplete) return null; // Banner gone once profile is complete

  return (
    <>
      <div style={{
        background:    'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border:        '1px solid #f59e0b',
        borderRadius:  '12px',
        padding:       '16px 20px',
        marginBottom:  '24px',
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
        gap:           '16px',
        flexWrap:      'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 700, color: '#92400e', margin: 0, fontSize: '15px' }}>
              Your profile is incomplete!
            </p>
            <p style={{ color: '#b45309', margin: '4px 0 0 0', fontSize: '13px' }}>
              {isDonor
                ? 'Please fill in your donor details so receivers can find you when they need blood.'
                : 'Please fill in your details so we can match you with the right donors.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background:   '#d97706',
            color:        '#fff',
            border:       'none',
            borderRadius: '8px',
            padding:      '10px 20px',
            fontWeight:   700,
            fontSize:     '14px',
            cursor:       'pointer',
            whiteSpace:   'nowrap',
            flexShrink:   0,
          }}
        >
          Complete Profile →
        </button>
      </div>

      {showModal && (
        <ExtraDetailsModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
