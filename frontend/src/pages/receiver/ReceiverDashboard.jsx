// src/pages/receiver/ReceiverDashboard.jsx — Interactive animated receiver dashboard

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { receiverApi } from '../../services/api';
import ProfileWarningBanner from '../../components/common/ProfileWarningBanner';
import IncomingDonorAlertsStack from '../../components/common/IncomingDonorAlertsStack';
import ReceiverLayout from '../../components/receiver/ReceiverLayout';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Users, ClipboardList, CheckCircle, Search, PlusCircle, AlertOctagon, PhoneCall } from 'lucide-react';
import './Receiver.css';

// Animated Stat Component
function AnimatedStat({ value, subtitle, label, icon, iconBg = '#fef2f2' }) {
  const animatedNumber = useAnimatedCounter(value, 1200);
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{animatedNumber}</p>
        {subtitle && <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

export default function ReceiverDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [donors,   setDonors]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState({ blood_group: '', city: '' });

  const firstName = user?.full_name?.split(' ')[0] || 'Receiver';

  const fetchDonors = useCallback(async (isManual = false) => {
    try {
      const params = {};
      if (filter.blood_group) params.blood_group = filter.blood_group;
      if (filter.city)        params.city        = filter.city;
      const data = await receiverApi.searchDonors(params);
      setDonors(data.donors || []);
      if (isManual) {
        addToast({ title: 'Search Updated 🔍', message: `Found ${data.donors?.length || 0} active donors.` });
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filter, addToast]);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await receiverApi.getMyRequests();
      setRequests(data.requests || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchDonors(false);
    fetchRequests();
  }, [fetchDonors, fetchRequests]);

  function applyFilter(e) {
    e.preventDefault();
    setLoading(true);
    fetchDonors(true);
  }

  function quickFilterBlood(group) {
    setFilter(prev => ({ ...prev, blood_group: group }));
    addToast({ title: `Filter: ${group || 'All Groups'}`, message: 'Updating matching donors...' });
  }

  return (
    <ReceiverLayout>
      <div className="page-content">
        {/* Real-Time Incoming Donor Responses Stack at Top */}
        <IncomingDonorAlertsStack />

        <ProfileWarningBanner />

        {/* Rare Blood Type Notification Card */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: 16,
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
        }}>
          <AlertOctagon size={28} color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: '0 0 3px', fontWeight: 800, fontSize: 14, color: '#1e40af' }}>
              Looking for Rare Blood Types (e.g. O-, AB-)?
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.4 }}>
              HemoLink instantly notifies all eligible registered donors in real-time. Create an urgent request if you cannot find an immediate match.
            </p>
          </div>
        </div>

        {/* Welcome Hero */}
        <div className="welcome-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <p className="page-tag">Patient & Receiver Hub</p>
            {/* <Badge variant="success" pulse pulseColor="green">
              Live Network
            </Badge> */}
          </div>
          <h1 className="page-title">Hello, {firstName} 👋</h1>
          <p className="page-sub">
            Connect immediately with ready, verified blood donors or broadcast an emergency hospital request.
          </p>
        </div>

        {/* Stats Grid with Animated Counters */}
        <div className="stats-grid">
          <AnimatedStat
            value={donors.length}
            label="Available Donors"
            subtitle="Ready to donate now"
            icon={<Users size={22} color="#dc2626" />}
            iconBg="#fef2f2"
          />

          <AnimatedStat
            value={requests.length}
            label="My Total Requests"
            subtitle="Emergency broadcasts"
            icon={<ClipboardList size={22} color="#2563eb" />}
            iconBg="#eff6ff"
          />

          <AnimatedStat
            value={requests.filter(r => r.status === 'Open').length}
            label="Active Emergencies"
            subtitle="Awaiting fulfillment"
            icon={<CheckCircle size={22} color="#16a34a" />}
            iconBg="#f0fdf4"
          />
        </div>

        {/* Search Donors Section */}
        <section className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Verified Active Donors</h2>
              <p className="section-sub">
                Donors are matched in real-time from our MySQL database. Filter by blood group or location.
              </p>
            </div>
            <Link to="/receiver/request" className="action-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusCircle size={16} /> Broadcast Emergency Request
            </Link>
          </div>

          {/* Quick Filter Chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['', 'O-', 'O+', 'A+', 'B+', 'AB+'].map((group) => (
              <button
                key={group}
                onClick={() => quickFilterBlood(group)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  border: filter.blood_group === group ? '1.5px solid #dc2626' : '1px solid #e5e7eb',
                  background: filter.blood_group === group ? '#fef2f2' : '#ffffff',
                  color: filter.blood_group === group ? '#dc2626' : '#4b5563',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {group === '' ? 'All Groups' : group === 'O-' ? '🩸 O- (Rare)' : group}
              </button>
            ))}
          </div>

          {/* Search Inputs */}
          <form onSubmit={applyFilter} className="filter-form">
            <select
              value={filter.blood_group}
              onChange={e => setFilter(f => ({ ...f, blood_group: e.target.value }))}
              className="filter-select"
            >
              <option value="">All Blood Groups</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <input
              value={filter.city}
              onChange={e => setFilter(f => ({ ...f, city: e.target.value }))}
              className="filter-input"
              placeholder="Search by city (e.g. Mumbai, New Delhi, Hyderabad)..."
            />
            <button type="submit" className="filter-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={14} /> Search Donors
            </button>
          </form>

          {/* Loading Skeletons */}
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              <Skeleton height="100px" />
              <Skeleton height="100px" />
              <Skeleton height="100px" />
            </div>
          )}

          {!loading && donors.length === 0 && (
            <div className="empty-state">
              <p style={{ fontSize: 24, margin: '0 0 8px' }}>🔍</p>
              <p style={{ margin: 0, fontWeight: 700 }}>No donors currently matching this filter.</p>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
                Don't worry! Click "Broadcast Emergency Request" above to immediately alert all nearby donors!
              </p>
            </div>
          )}

          {/* Donors Grid */}
          <div className="donors-grid">
            {donors.map(donor => (
              <div key={donor.id} className="donor-card" style={{ transition: 'all 0.2s ease' }}>
                <div className="donor-avatar">{donor.full_name?.charAt(0).toUpperCase()}</div>
                <div className="donor-info">
                  <p className="donor-name">{donor.full_name}</p>
                  <p className="donor-meta">
                    <span className="blood-badge" style={{ fontSize: 13 }}>{donor.blood_group}</span>
                    <span>📍 <strong>{donor.city}</strong></span>
                  </p>
                  <p className="donor-meta" style={{ color: '#059669', fontWeight: 600 }}>
                    💉 {donor.total_donations} lifetime donations
                  </p>
                </div>
                <Link
                  to="/receiver/request"
                  className="contact-btn"
                  state={{ donor }}
                  title="Request blood from this donor"
                >
                  Request 🩸
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* My Recent Requests Section */}
        {requests.length > 0 && (
          <section className="section">
            <div className="section-header">
              <div>
                <h2 className="section-title">My Broadcasted Requests</h2>
                <p className="section-sub">Live status of your hospital requests and donor acceptances.</p>
              </div>
              <Link to="/receiver/requests" className="view-all-link">
                View All My Requests →
              </Link>
            </div>

            <div className="requests-list">
              {requests.slice(0, 3).map(req => (
                <div key={req.id} className="request-card">
                  <div className="request-left">
                    <span className="blood-badge" style={{ fontSize: 13 }}>{req.blood_group}</span>
                    <div>
                      <p className="request-hospital">{req.hospital_name}</p>
                      <p className="request-meta">
                        📍 <strong>{req.city}</strong> · 💬 <strong>{req.response_count} donor(s) responded</strong>
                      </p>
                    </div>
                  </div>
                  <span className={`status-badge status-${req.status.toLowerCase()}`}>
                    ● {req.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ReceiverLayout>
  );
}
