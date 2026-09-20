// src/components/common/ExtraDetailsModal.jsx
// Modal popup for completing profile after signup
// Donor: 3-step form | Receiver: single form
// On submit → POST /api/donor/profile or POST /api/receiver/profile → banner gone

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { donorApi, receiverApi } from '../../services/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ─── Styles (inline for zero CSS file dependency) ────────────
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 9999, padding: '16px',
};
const modal = {
  background: '#fff', borderRadius: '16px', padding: '32px',
  width: '100%', maxWidth: '560px', maxHeight: '90vh',
  overflowY: 'auto', position: 'relative',
};
const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
  borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
  marginTop: '6px',
};
const labelStyle = { display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151' };
const btnPrimary = {
  background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '11px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
};
const btnSecondary = {
  background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px',
  padding: '11px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
};
const errStyle = { color: '#dc2626', fontSize: '12px', marginTop: '4px' };

// ════════════════════════════════════════════════════════════
export default function ExtraDetailsModal({ onClose }) {
  const { isDonor, updateUser } = useAuth();

  return isDonor
    ? <DonorDetailsModal onClose={onClose} updateUser={updateUser} />
    : <ReceiverDetailsModal onClose={onClose} updateUser={updateUser} />;
}

// ════════════════════════════════════════════════════════════
// RECEIVER DETAILS — single form
// ════════════════════════════════════════════════════════════
function ReceiverDetailsModal({ onClose, updateUser }) {
  const [form, setForm] = useState({
    blood_group: '', date_of_birth: '', gender: '', phone: '', city: '', address: '',
  });
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.blood_group || !form.phone || !form.city) {
      setError('Blood group, phone, and city are required.'); return;
    }
    setSaving(true); setError('');
    try {
      await receiverApi.createProfile(form);
      updateUser({ profileComplete: true });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#6b7280' }}>✕</button>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'#111827' }}>Complete Your Profile</h2>
          <p style={{ margin:'6px 0 0', color:'#6b7280', fontSize:14 }}>Fill in your details to start finding donors.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <label style={labelStyle}>Blood Group *</label>
              <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)} style={inputStyle} required>
                <option value="">Select</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} placeholder="10-digit mobile" required />
            </div>
            <div>
              <label style={labelStyle}>Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inputStyle}>
                <option value="">Select</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={labelStyle}>City / Location *</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle} placeholder="e.g. New Delhi" required />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={labelStyle}>Full Address</label>
              <textarea rows={3} value={form.address} onChange={e => set('address', e.target.value)} style={inputStyle} placeholder="House no, Street, Area..." />
            </div>
          </div>
          {error && <p style={errStyle}>⚠️ {error}</p>}
          <div style={{ display:'flex', gap:12, marginTop:24, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondary} disabled={saving}>Cancel</button>
            <button type="submit" style={btnPrimary} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Continue →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DONOR DETAILS — 3-step form
// ════════════════════════════════════════════════════════════
function DonorDetailsModal({ onClose, updateUser }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    blood_group:'', date_of_birth:'', gender:'', weight_kg:'', phone:'',
    house_no:'', street:'', city:'', state:'', pincode:'',
    last_donation_date:'', is_first_time:true, has_chronic_illness:false,
    on_medication:false, tattoo_recent:false,
  });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const stepTitles = ['Personal Info', 'Address', 'Medical History'];

  function validateStep1() {
    if (!form.blood_group || !form.date_of_birth || !form.gender || !form.weight_kg || !form.phone)
      return 'Please fill all required fields.';
    return '';
  }
  function validateStep2() {
    if (!form.city || !form.state || !form.pincode) return 'City, state and pincode are required.';
    return '';
  }

  function handleNext() {
    setError('');
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : '';
    if (err) { setError(err); return; }
    setStep(s => s + 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await donorApi.createProfile(form);
      updateUser({ profileComplete: true });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  const RadioField = ({ label, fieldKey }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display:'flex', gap:20, marginTop:8 }}>
        {['Yes','No'].map(opt => (
          <label key={opt} style={{ display:'flex', alignItems:'center', gap:6, fontSize:14, cursor:'pointer' }}>
            <input type="radio" name={fieldKey} value={opt}
              checked={(opt === 'Yes') === form[fieldKey]}
              onChange={() => set(fieldKey, opt === 'Yes')} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#6b7280' }}>✕</button>

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'#111827' }}>Complete Donor Profile</h2>
          <p style={{ margin:'6px 0 0', color:'#6b7280', fontSize:14 }}>Step {step} of 3 — {stepTitles[step-1]}</p>
        </div>

        {/* Step indicators */}
        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{
              flex:1, height:4, borderRadius:4,
              background: s <= step ? '#dc2626' : '#e5e7eb',
              transition:'background 0.3s',
            }} />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <label style={labelStyle}>Blood Group *</label>
                <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)} style={inputStyle} required>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date of Birth *</label>
                <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Gender *</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inputStyle} required>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Weight (kg) *</label>
                <input type="number" min="45" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} style={inputStyle} placeholder="e.g. 65" required />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Phone *</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} placeholder="10-digit mobile number" required />
              </div>
            </div>
          )}

          {/* ── STEP 2: Address ── */}
          {step === 2 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>House / Flat No.</label>
                <input value={form.house_no} onChange={e => set('house_no', e.target.value)} style={inputStyle} placeholder="e.g. B-204" />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Street / Area</label>
                <input value={form.street} onChange={e => set('street', e.target.value)} style={inputStyle} placeholder="e.g. Sector 12, Dwarka" />
              </div>
              <div>
                <label style={labelStyle}>City *</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle} placeholder="e.g. New Delhi" required />
              </div>
              <div>
                <label style={labelStyle}>State *</label>
                <input value={form.state} onChange={e => set('state', e.target.value)} style={inputStyle} placeholder="e.g. Delhi" required />
              </div>
              <div>
                <label style={labelStyle}>Pincode *</label>
                <input value={form.pincode} onChange={e => set('pincode', e.target.value)} style={inputStyle} placeholder="e.g. 110078" required />
              </div>
            </div>
          )}

          {/* ── STEP 3: Medical History ── */}
          {step === 3 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <label style={labelStyle}>Last Donation Date</label>
                <input type="date" value={form.last_donation_date} onChange={e => set('last_donation_date', e.target.value)} style={inputStyle} />
              </div>
              <div />
              <RadioField label="Are you a first-time donor?" fieldKey="is_first_time" />
              <RadioField label="Any chronic illness?" fieldKey="has_chronic_illness" />
              <RadioField label="Currently on medication?" fieldKey="on_medication" />
              <RadioField label="Tattoo/piercing in last 6 months?" fieldKey="tattoo_recent" />
            </div>
          )}

          {error && <p style={{ ...errStyle, marginTop:16 }}>⚠️ {error}</p>}

          {/* Navigation */}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:24, gap:12 }}>
            {step > 1
              ? <button type="button" onClick={() => setStep(s => s-1)} style={btnSecondary}>← Back</button>
              : <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
            }
            {step < 3
              ? <button type="button" onClick={handleNext} style={btnPrimary}>Next →</button>
              : <button type="submit" style={btnPrimary} disabled={saving}>
                  {saving ? 'Saving...' : 'Complete Registration ✓'}
                </button>
            }
          </div>
        </form>
      </div>
    </div>
  );
}
