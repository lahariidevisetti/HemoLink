// src/pages/donor/DonorProfile.jsx — View + Edit donor profile

import { useState, useEffect } from 'react';
import { donorApi } from '../../services/api';
import DonorLayout from '../../components/donor/DonorLayout';
import './Donor.css';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function DonorProfile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState({});
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    donorApi.getProfile()
      .then(data => { setProfile(data.profile); setDraft(data.profile); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setMsg('');
    try {
      await donorApi.updateProfile(draft);
      setProfile(draft); setEditing(false);
      setMsg('✅ Profile updated!');
    } catch (err) { setMsg('⚠️ ' + err.message); }
    finally { setSaving(false); }
  }

  async function toggleAvailability() {
    try {
      const newVal = !profile.is_available;
      await donorApi.toggleAvailability({ is_available: newVal });
      setProfile(p => ({ ...p, is_available: newVal }));
    } catch (err) { alert('⚠️ ' + err.message); }
  }

  if (loading) return <DonorLayout><div className="loading-text">Loading profile...</div></DonorLayout>;
  if (!profile) return <DonorLayout><div className="empty-state"><p>Profile not found. Complete your profile from the dashboard.</p></div></DonorLayout>;

  const fields = [
    { label:'Blood Group',       key:'blood_group', type:'select' },
    { label:'Phone',             key:'phone' },
    { label:'Date of Birth',     key:'date_of_birth', type:'date' },
    { label:'Gender',            key:'gender', type:'gender-select' },
    { label:'Weight (kg)',       key:'weight_kg', type:'number' },
    { label:'Last Donation',     key:'last_donation_date', type:'date' },
    { label:'City',              key:'city' },
    { label:'State',             key:'state' },
    { label:'Pincode',           key:'pincode' },
  ];

  return (
    <DonorLayout>
      <div className="page-content">
        <p className="page-tag">Profile</p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <h1 className="page-title" style={{ margin:0 }}>My Profile 👤</h1>
          {editing
            ? <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setEditing(false)} style={{ padding:'9px 18px', border:'1px solid #d1d5db', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', background:'#fff' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding:'9px 18px', background:'#dc2626', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  {saving ? 'Saving...' : '✓ Save'}
                </button>
              </div>
            : <button onClick={() => setEditing(true)} style={{ padding:'9px 18px', border:'1px solid #dc2626', color:'#dc2626', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', background:'#fff' }}>✏️ Edit</button>
          }
        </div>

        {msg && <div style={{ padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16, background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✅') ? '#166534' : '#dc2626', border: `1px solid ${msg.startsWith('✅') ? '#86efac' : '#fca5a5'}` }}>{msg}</div>}

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card stat-red"><span className="stat-icon">🩸</span><div><p className="stat-label">Blood Group</p><p className="stat-value">{profile.blood_group}</p></div></div>
          <div className="stat-card stat-blue"><span className="stat-icon">💉</span><div><p className="stat-label">Donations</p><p className="stat-value">{profile.total_donations}</p></div></div>
          <div className="stat-card stat-green" style={{ cursor:'pointer' }} onClick={toggleAvailability}>
            <span className="stat-icon">{profile.is_available ? '✅' : '❌'}</span>
            <div><p className="stat-label">Availability</p><p className="stat-value" style={{ fontSize:16 }}>{profile.is_available ? 'Available' : 'Unavailable'}</p>
            <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>Click to toggle</p></div>
          </div>
        </div>

        {/* Fields */}
        <div className="section">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {fields.map(({ label, key, type }) => (
              <div key={key}>
                <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#9ca3af', margin:'0 0 6px' }}>{label}</p>
                {editing ? (
                  type === 'select'
                    ? <select value={draft[key] || ''} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:14 }}>
                        {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    : type === 'gender-select'
                    ? <select value={draft[key] || ''} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:14 }}>
                        <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    : <input type={type || 'text'} value={draft[key] || ''} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:14 }} />
                ) : (
                  <p style={{ fontWeight:600, fontSize:15, margin:0, color: profile[key] ? '#111827' : '#9ca3af' }}>
                    {(type === 'date' || key.includes('date')) && profile[key] ? new Date(profile[key]).toLocaleDateString() : (profile[key] ?? '—')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DonorLayout>
  );
}
