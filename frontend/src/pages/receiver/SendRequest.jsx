// src/pages/receiver/SendRequest.jsx — Interactive blood request creation with toast & urgency selector

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { receiverApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ReceiverLayout from '../../components/receiver/ReceiverLayout';
import { Badge } from '../../components/ui/Badge';
import { AlertCircle, Hospital, MapPin, Droplet, Clock, Send } from 'lucide-react';
import { getEligibleDonorGroups } from '../../utils/bloodCompatibility';
import '../donor/Donor.css';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function SendRequest() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { addToast } = useToast();
  const prefill   = location.state?.donor;

  const [form, setForm] = useState({
    blood_group:     prefill?.blood_group || '',
    hospital_name:   '',
    city:            prefill?.city || '',
    urgency:         'High',
    units_needed:    1,
    additional_note: prefill ? `Requested specifically for donor ${prefill.full_name}` : '',
    document_url:    '',
  });
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFileName,  setDocFileName]  = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addToast({ title: 'File Too Large', message: 'Maximum document size is 10MB.', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    setUploadingDoc(true);
    setDocFileName(file.name);

    try {
      const data = await receiverApi.uploadDocument(formData);
      set('document_url', data.url);
      addToast({
        title: 'Document Uploaded & Verified 🩺',
        message: data.provider === 'cloudinary' ? 'Stored securely in Cloudinary (Hemo_LInk).' : 'Stored securely for donor verification.',
        type: 'success',
      });
    } catch (err) {
      addToast({ title: 'Upload Failed', message: err.message, type: 'error' });
      setDocFileName('');
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.blood_group || !form.hospital_name || !form.city || !form.urgency) {
      setError('Please fill all required fields.'); return;
    }
    setError(''); setLoading(true);
    try {
      await receiverApi.createRequest(form);
      addToast({
        title: 'Emergency Request Broadcasted! 🩸',
        message: `Matching ${form.blood_group} donors and email alerts have been sent in real-time.`,
        type: 'blood',
        duration: 5000,
      });
      setTimeout(() => navigate('/receiver/requests'), 1200);
    } catch (err) {
      setError(err.message);
      addToast({ title: 'Request Submission Error', message: err.message, type: 'error' });
    } finally { setLoading(false); }
  }

  return (
    <ReceiverLayout>
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <p className="page-tag">Emergency Dispatch</p>
          <Badge variant="danger" pulse pulseColor="red">
            High Priority
          </Badge>
        </div>
        <h1 className="page-title">Broadcast Blood Request 🩸</h1>
        <p className="page-sub">
          Submit your patient requirement. All eligible matching donors are notified instantly via platform and email alerts.
        </p>

        <div className="section" style={{ maxWidth: 640 }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 20, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Blood Group */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                Required Blood Group *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {BLOOD_GROUPS.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => set('blood_group', g)}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 14,
                      border: form.blood_group === g ? '2px solid #dc2626' : '1.5px solid #e5e7eb',
                      background: form.blood_group === g ? '#fef2f2' : '#ffffff',
                      color: form.blood_group === g ? '#dc2626' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Medical Compatibility Analogy Tip */}
              {form.blood_group && (
                <div style={{
                  marginTop: 10,
                  padding: '12px 14px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>🩸</span>
                  <div style={{ fontSize: 12 }}>
                    <p style={{ margin: '0 0 3px', fontWeight: 800, color: '#166534', fontSize: 13 }}>
                      Medical Compatibility Analogy ({form.blood_group} Patient)
                    </p>
                    <p style={{ margin: 0, color: '#15803d', lineHeight: 1.4 }}>
                      Can safely receive blood from: <strong style={{ color: '#14532d' }}>{getEligibleDonorGroups(form.blood_group).join(', ')}</strong>.
                      {form.blood_group === 'AB+' && ' (Universal Recipient — can accept blood from all 8 blood groups!)'}
                      {form.blood_group === 'O-' && ' (Universal Donor — can only safely receive O- blood)'}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#166534', fontWeight: 600 }}>
                      ✉️ Our system will automatically dispatch emergency alerts to all matching and compatible donors!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Urgency Selector */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                Urgency Level *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { level: 'Critical', label: '🔴 Critical', desc: 'Within 2-4 hours' },
                  { level: 'High',     label: '🟠 High',     desc: 'Within 12 hours' },
                  { level: 'Medium',   label: '🟡 Medium',   desc: 'Within 24-48 hours' },
                ].map(u => (
                  <button
                    key={u.level}
                    type="button"
                    onClick={() => set('urgency', u.level)}
                    style={{
                      padding: '12px',
                      borderRadius: 12,
                      textAlign: 'left',
                      border: form.urgency === u.level ? '2px solid #dc2626' : '1.5px solid #e5e7eb',
                      background: form.urgency === u.level ? '#fff5f5' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: form.urgency === u.level ? '#dc2626' : '#111827' }}>
                      {u.label}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6b7280' }}>
                      {u.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Hospital Name */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                Hospital / Medical Center Name *
              </label>
              <input
                value={form.hospital_name}
                onChange={e => set('hospital_name', e.target.value)}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14 }}
                placeholder="e.g. AIIMS Emergency Ward / Apollo Hospital"
                required
              />
            </div>

            {/* City and Units */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  City / Location *
                </label>
                <input
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14 }}
                  placeholder="e.g. Mumbai, New Delhi"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Units of Blood (Pints) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.units_needed}
                  onChange={e => set('units_needed', parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14 }}
                  required
                />
              </div>
            </div>

            {/* Patient Note */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                Special Clinical Notes / Patient Condition
              </label>
              <textarea
                rows={3}
                value={form.additional_note}
                onChange={e => set('additional_note', e.target.value)}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14, resize: 'vertical' }}
                placeholder="e.g. Surgery scheduled tomorrow morning; emergency ICU case..."
              />
            </div>

            {/* Doctor Prescription / Operation Document Verification */}
            <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  <span>🩺</span> Doctor Prescription / Operation Document
                </label>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Optional Verification</span>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px', lineHeight: 1.4 }}>
                Upload hospital admission letter, doctor's prescription, or surgical consent. Donors can view this to verify authenticity before donating.
              </p>

              {form.document_url ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#065f46', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {docFileName || 'Verified Document'}
                      </p>
                      <a href={form.document_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, textDecoration: 'underline' }}>
                        Preview Document ↗
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { set('document_url', ''); setDocFileName(''); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 8px' }}
                  >
                    Remove ✕
                  </button>
                </div>
              ) : (
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  cursor: uploadingDoc ? 'wait' : 'pointer',
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    disabled={uploadingDoc}
                    style={{ display: 'none' }}
                  />
                  <span>{uploadingDoc ? '⏳ Uploading to Cloudinary...' : '📎 Choose Document (Image or PDF, max 10MB)'}</span>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ui-btn ui-btn--primary"
              style={{
                padding: '14px',
                fontSize: 15,
                fontWeight: 800,
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? 'Transmitting to Network...' : <><Send size={16} /> Broadcast Emergency Request Now</>}
            </button>
          </form>
        </div>
      </div>
    </ReceiverLayout>
  );
}
