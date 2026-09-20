// src/pages/receiver/SearchDonors.jsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { receiverApi } from '../../services/api';
import ReceiverLayout from '../../components/receiver/ReceiverLayout';
import '../donor/Donor.css';

export default function SearchDonors() {
  const [donors,  setDonors]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState({ blood_group:'', city:'' });

  async function load(f = filter) {
    setLoading(true);
    try {
      const params = {};
      if (f.blood_group) params.blood_group = f.blood_group;
      if (f.city)        params.city        = f.city;
      const data = await receiverApi.searchDonors(params);
      setDonors(data.donors || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <ReceiverLayout>
      <div className="page-content">
        <p className="page-tag">Search</p>
        <h1 className="page-title">Available Donors 🩸</h1>
        <p className="page-sub">Find donors by blood group or city. All donors shown are currently available.</p>

        <div className="section">
          <form onSubmit={e => { e.preventDefault(); load(); }} className="filter-form">
            <select value={filter.blood_group} onChange={e => setFilter(f => ({ ...f, blood_group: e.target.value }))} className="filter-select">
              <option value="">All Blood Groups</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <input value={filter.city} onChange={e => setFilter(f => ({ ...f, city: e.target.value }))}
              className="filter-input" placeholder="Search by city..." />
            <button type="submit" className="filter-btn">Search 🔍</button>
          </form>

          {loading && <div className="loading-text">Searching donors...</div>}
          {!loading && donors.length === 0 && <div className="empty-state"><p>😔 No available donors found. Try different filters.</p></div>}

          <div className="donors-grid">
            {donors.map(donor => (
              <div key={donor.id} className="donor-card">
                <div className="donor-avatar">{donor.full_name?.charAt(0)}</div>
                <div className="donor-info">
                  <p className="donor-name">{donor.full_name}</p>
                  <p className="donor-meta">
                    <span className="blood-badge">{donor.blood_group}</span>
                    <span>📍 {donor.city}</span>
                  </p>
                  <p className="donor-meta">💉 {donor.total_donations} donations</p>
                  {donor.last_donation_date && (
                    <p className="donor-meta" style={{ color:'#9ca3af' }}>
                      Last donated: {new Date(donor.last_donation_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Link to="/receiver/request" state={{ donor }} className="contact-btn">Request 🩸</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ReceiverLayout>
  );
}
