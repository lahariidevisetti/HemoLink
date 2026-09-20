// src/components/common/ExtraDetailsModal.jsx
// Strict, compulsory modal popup for completing profile after signup
// Donor: 3-step form with robust Last Donation Date handling | Receiver: single form
// On submit → POST /api/donor/profile or POST /api/receiver/profile → unlocks platform

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { donorApi, receiverApi } from '../../services/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ─── Styles ──────────────────────────────────────────────────
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.85)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
  padding: '16px',
};

const modalStyle = {
  background: '#ffffff',
  borderRadius: '20px',
  padding: '32px',
  width: '100%',
  maxWidth: '580px',
  maxHeight: '92vh',
  overflowY: 'auto',
  position: 'relative',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(220, 38, 38, 0.1)',
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid #d1d5db',
  borderRadius: '10px',
  fontSize: '14px',
  boxSizing: 'border-box',
  marginTop: '6px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block',
  fontWeight: 600,
  fontSize: '13px',
  color: '#374151',
};

const btnPrimary = {
  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  padding: '12px 28px',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
  transition: 'all 0.2s ease',
};

const btnSecondary = {
  background: '#f3f4f6',
  color: '#374151',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '12px 24px',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
};

const errStyle = {
  color: '#dc2626',
  fontSize: '13px',
  marginTop: '8px',
  fontWeight: 500,
  background: '#fef2f2',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #fecaca',
};

// ─── Reusable Radio Field (Declared outside to prevent re-mounting) ──
function RadioField({ label, value, onChange, options = [{ label: 'Yes', val: true }, { label: 'No', val: false }] }) {
  return (
    <div style={{ marginTop: 4 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {options.map(opt => {
          const isSelected = value === opt.val;
          return (
            <button
              type="button"
              key={opt.label}
              onClick={() => onChange(opt.val)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 8,
                border: isSelected ? '2px solid #dc2626' : '1px solid #d1d5db',
                background: isSelected ? '#fef2f2' : '#ffffff',
                color: isSelected ? '#dc2626' : '#4b5563',
                fontWeight: isSelected ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                border: isSelected ? '4px solid #dc2626' : '2px solid #9ca3af',
                background: '#fff',
                display: 'inline-block'
              }} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
export default function ExtraDetailsModal({ onClose, isStrict = true }) {
  const { isDonor, updateUser } = useAuth();
  const { addToast } = useToast();

  return isDonor
    ? <DonorDetailsModal onClose={onClose} updateUser={updateUser} isStrict={isStrict} addToast={addToast} />
    : <ReceiverDetailsModal onClose={onClose} updateUser={updateUser} isStrict={isStrict} addToast={addToast} />;
}

// ════════════════════════════════════════════════════════════
// RECEIVER DETAILS — Compulsory Profile Form
// ════════════════════════════════════════════════════════════
function ReceiverDetailsModal({ onClose, updateUser, isStrict, addToast }) {
  const [form, setForm] = useState({
    blood_group: '', date_of_birth: '', gender: '', phone: '', city: '', address: '',
  });
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.blood_group || !form.phone || !form.city) {
      setError('Blood group, phone, and city are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await receiverApi.createProfile(form);
      updateUser({ profileComplete: true, ...form });
      window.dispatchEvent(new Event('hemolink_profile_updated'));
      addToast({
        title: 'Profile Complete! 🎉',
        message: 'Your recipient profile has been saved. You can now request blood in emergencies.',
        type: 'success',
      });
      if (onClose) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={e => !isStrict && e.target === e.currentTarget && onClose?.()}>
      <div style={modalStyle}>
        {!isStrict && (
          <button
            type="button"
            onClick={onClose}
            style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}
          >
            ✕
          </button>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, padding: '10px 14px', marginBottom: 20,
          color: '#991b1b', fontSize: 13, fontWeight: 600,
        }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <span>Compulsory Step: Please complete your recipient details to unlock hospital blood requests.</span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Complete Recipient Profile</h2>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
            Enter patient location and contact details for medical cross-matching.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Blood Group Needed *</label>
              <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)} style={inputStyle} required>
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Contact Mobile Phone *</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} placeholder="10-digit mobile number" required />
            </div>
            <div>
              <label style={labelStyle}>Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inputStyle}>
                <option value="">Select Gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>City / Hospital Region *</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle} placeholder="e.g. Ongole, Mumbai, Hyderabad" required />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Full Address</label>
              <textarea rows={3} value={form.address} onChange={e => set('address', e.target.value)} style={inputStyle} placeholder="House no, street, locality or landmark..." />
            </div>
          </div>

          {error && <p style={errStyle}>⚠️ {error}</p>}

          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
            {!isStrict && (
              <button type="button" onClick={onClose} style={btnSecondary} disabled={saving}>Cancel</button>
            )}
            <button type="submit" style={btnPrimary} disabled={saving}>
              {saving ? 'Saving Profile...' : 'Save & Unlock Dashboard →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DONOR DETAILS — 3-Step Compulsory Form
// ════════════════════════════════════════════════════════════
function DonorDetailsModal({ onClose, updateUser, isStrict, addToast }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    blood_group: '',
    date_of_birth: '',
    gender: '',
    weight_kg: '',
    phone: '',
    house_no: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    last_donation_date: '',
    is_first_time: true,
    has_chronic_illness: false,
    on_medication: false,
    tattoo_recent: false,
  });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const stepTitles = ['Personal Info', 'Location & Address', 'Medical History & Last Donation'];

  function validateStep1() {
    if (!form.blood_group) return 'Please select your Blood Group.';
    if (!form.date_of_birth) return 'Please enter your Date of Birth.';
    if (!form.gender) return 'Please select your Gender.';
    if (!form.weight_kg || Number(form.weight_kg) < 45) return 'Weight must be at least 45 kg to be eligible for blood donation.';
    if (!form.phone || form.phone.trim().length < 8) return 'Please provide a valid contact mobile phone.';
    return '';
  }

  function validateStep2() {
    if (!form.city.trim()) return 'City is required.';
    if (!form.state.trim()) return 'State is required.';
    if (!form.pincode.trim()) return 'Pincode is required.';
    return '';
  }

  function handleNext(e) {
    if (e) e.preventDefault();
    setError('');
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : '';
    if (err) {
      setError(err);
      return;
    }
    setStep(s => s + 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.is_first_time && !form.last_donation_date) {
      setError('Please provide your last blood donation date.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        last_donation_date: form.is_first_time ? null : (form.last_donation_date || null),
      };

      await donorApi.createProfile(payload);
      updateUser({ profileComplete: true, ...payload });
      window.dispatchEvent(new Event('hemolink_profile_updated'));

      addToast({
        title: 'Profile Complete! 🎉',
        message: 'Thank you for registering as a verified blood donor. You are now active in the network!',
        type: 'success',
      });

      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Failed to save donor profile.');
    } finally {
      setSaving(false);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={overlayStyle} onClick={e => !isStrict && e.target === e.currentTarget && onClose?.()}>
      <div style={modalStyle}>
        {!isStrict && (
          <button
            type="button"
            onClick={onClose}
            style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}
          >
            ✕
          </button>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, padding: '10px 14px', marginBottom: 18,
          color: '#991b1b', fontSize: 13, fontWeight: 600,
        }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <span>Strict Step: Profile completion is compulsory to activate your donor profile.</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Complete Donor Profile</h2>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
            Step {step} of 3 — <span style={{ color: '#dc2626', fontWeight: 600 }}>{stepTitles[step - 1]}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 5, borderRadius: 4,
              background: s <= step ? '#dc2626' : '#e5e7eb',
              transition: 'background 0.3s ease',
            }} />
          ))}
        </div>

        <form onSubmit={step === 3 ? handleSubmit : handleNext}>
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Blood Group *</label>
                <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)} style={inputStyle} required>
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date of Birth *</label>
                <input
                  type="date"
                  max={todayStr}
                  value={form.date_of_birth}
                  onChange={e => set('date_of_birth', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Gender *</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inputStyle} required>
                  <option value="">Select Gender</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Weight (kg) *</label>
                <input
                  type="number"
                  min="45"
                  max="200"
                  value={form.weight_kg}
                  onChange={e => set('weight_kg', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. 65 (min 45 kg)"
                  required
                />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Mobile Phone Number *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  style={inputStyle}
                  placeholder="10-digit mobile number for emergency notifications"
                  required
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>House / Flat No.</label>
                <input value={form.house_no} onChange={e => set('house_no', e.target.value)} style={inputStyle} placeholder="e.g. Flat 302, Green Meadows" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Street / Area</label>
                <input value={form.street} onChange={e => set('street', e.target.value)} style={inputStyle} placeholder="e.g. RIMS Road, Lawyerpet" />
              </div>
              <div>
                <label style={labelStyle}>City *</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle} placeholder="e.g. Ongole" required />
              </div>
              <div>
                <label style={labelStyle}>State *</label>
                <input value={form.state} onChange={e => set('state', e.target.value)} style={inputStyle} placeholder="e.g. Andhra Pradesh" required />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Pincode *</label>
                <input value={form.pincode} onChange={e => set('pincode', e.target.value)} style={inputStyle} placeholder="e.g. 523001" required />
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <RadioField
                label="Are you donating blood for the very first time? *"
                value={form.is_first_time}
                onChange={(val) => {
                  set('is_first_time', val);
                  if (val) set('last_donation_date', '');
                }}
              />

              {form.is_first_time ? (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#15803d',
                  fontSize: 13,
                }}>
                  <span style={{ fontSize: 18 }}>🎉</span>
                  <span><strong>Welcome First-Time Donor!</strong> No previous donation date needed. We are excited to have you join our lifesaving community!</span>
                </div>
              ) : (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px',
                }}>
                  <label style={labelStyle}>Last Blood Donation Date *</label>
                  <p style={{ margin: '2px 0 8px', fontSize: 12, color: '#64748b' }}>
                    Please select the date of your most recent blood donation (must be in the past):
                  </p>
                  <input
                    type="date"
                    max={todayStr}
                    value={form.last_donation_date}
                    onChange={e => set('last_donation_date', e.target.value)}
                    style={{ ...inputStyle, marginTop: 0 }}
                    required={!form.is_first_time}
                  />
                </div>
              )}

              <RadioField
                label="Do you have any chronic illnesses? (Heart condition, Diabetes, Cancer) *"
                value={form.has_chronic_illness}
                onChange={(val) => set('has_chronic_illness', val)}
              />

              <RadioField
                label="Are you currently taking any prescription medications? *"
                value={form.on_medication}
                onChange={(val) => set('on_medication', val)}
              />

              <RadioField
                label="Have you gotten a tattoo or body piercing in the last 6 months? *"
                value={form.tattoo_recent}
                onChange={(val) => set('tattoo_recent', val)}
              />
            </div>
          )}

          {error && <p style={errStyle}>⚠️ {error}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)} style={btnSecondary}>
                ← Back
              </button>
            ) : (
              !isStrict ? (
                <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
              ) : <div />
            )}

            {step < 3 ? (
              <button type="button" onClick={handleNext} style={btnPrimary}>
                Next: {stepTitles[step]} →
              </button>
            ) : (
              <button type="submit" style={btnPrimary} disabled={saving}>
                {saving ? 'Completing Registration...' : 'Complete & Unlock Dashboard ✓'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
