// src/pages/receiver/ReceiverProfile.jsx — View + Edit receiver profile

import { useState, useEffect } from 'react';
import { receiverApi } from '../../services/api';
import IncomingDonorAlertsStack from '../../components/common/IncomingDonorAlertsStack';
import ReceiverLayout from '../../components/receiver/ReceiverLayout';
import '../donor/Donor.css';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function ReceiverProfile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState({});
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    receiverApi.getProfile()
      .then(data => { setProfile(data.profile); setDraft(data.profile); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setMsg('');
    try {
      await receiverApi.updateProfile(draft);
      setProfile(draft); setEditing(false);
      setMsg('✅ Profile updated successfully!');
    } catch (err) { setMsg('⚠️ ' + err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <ReceiverLayout><div className="loading-text">Loading profile...</div></ReceiverLayout>;
  if (!profile) return <ReceiverLayout><div className="empty-state"><p>Profile not found. Complete your profile from the dashboard.</p></div></ReceiverLayout>;

  const fields = [
    { label:'Blood Group', key:'blood_group', type:'select' },
    { label:'Phone',       key:'phone' },
    { label:'Date of Birth', key:'date_of_birth', type:'date' },
    { label:'Gender',      key:'gender', type:'gender-select' },
    { label:'City',        key:'city' },
    { label:'Address',     key:'address', type:'textarea' },
  ];

  return (
    <ReceiverLayout>
      <div className="page-content">
        {/* Real-time incoming donor responses stack */}
        <IncomingDonorAlertsStack />

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
            : <button onClick={() => setEditing(true)} style={{ padding:'9px 18px', border:'1px solid #dc2626', color:'#dc2626', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', background:'#fff' }}>
                ✏️ Edit Profile
              </button>
          }
        </div>

        {msg && <div style={{ padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16, background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✅') ? '#166534' : '#dc2626', border: `1px solid ${msg.startsWith('✅') ? '#86efac' : '#fca5a5'}` }}>{msg}</div>}

        <div className="section">
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'#fef2f2', color:'#dc2626', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800 }}>
              {profile.full_name?.charAt(0)}
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:20, margin:'0 0 4px' }}>{profile.full_name}</p>
              <p style={{ color:'#6b7280', fontSize:13, margin:0 }}>{profile.email}</p>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {fields.map(({ label, key, type }) => (
              <div key={key} style={key === 'address' ? { gridColumn:'1/-1' } : {}}>
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
                    : type === 'textarea'
                    ? <textarea rows={3} value={draft[key] || ''} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:14, resize:'vertical' }} />
                    : <input type={type || 'text'} value={draft[key] || ''} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:14 }} />
                ) : (
                  <p style={{ fontWeight:600, fontSize:15, margin:0, color: profile[key] ? '#111827' : '#9ca3af' }}>
                    {key === 'date_of_birth' && profile[key] ? new Date(profile[key]).toLocaleDateString() : (profile[key] || '—')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ReceiverLayout>
  );
}
