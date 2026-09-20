// src/services/api.js
// Single source of truth for ALL API calls to the backend

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ─── Core fetch wrapper ────────────────────────────────────
async function request(path, options = {}, token = null) {
  const headers = {};
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  const data = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return data;
}

// Helper: read token from localStorage inside service calls
const getToken = () => localStorage.getItem('hemolink_token');

// ════════════════════════════════════════════════════════════
// AUTH API
// ════════════════════════════════════════════════════════════
export const authApi = {
  signup:        (body) => request('/api/auth/signup',         { method: 'POST', body: JSON.stringify(body) }),
  login:         (body) => request('/api/auth/login',          { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword:(body) => request('/api/auth/forgot-password',{ method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  getMe:         ()     => request('/api/auth/me', {}, getToken()),
};

// ════════════════════════════════════════════════════════════
// DONOR API
// ════════════════════════════════════════════════════════════
export const donorApi = {
  // Profile CRUD
  createProfile: (body)   => request('/api/donor/profile', { method: 'POST',   body: JSON.stringify(body) }, getToken()),
  getProfile:    ()       => request('/api/donor/profile', {}, getToken()),
  updateProfile: (body)   => request('/api/donor/profile', { method: 'PUT',    body: JSON.stringify(body) }, getToken()),
  deleteProfile: ()       => request('/api/donor/profile', { method: 'DELETE' }, getToken()),

  // Blood Requests (real-time dashboard)
  getRequests:       (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/donor/requests${qs ? '?' + qs : ''}`, {}, getToken());
  },
  getRequestById:    (id) => request(`/api/donor/requests/${id}`, {}, getToken()),
  respondToRequest:  (requestId, body) => request(`/api/donor/respond/${requestId}`, { method: 'POST', body: JSON.stringify(body) }, getToken()),

  // History & Availability
  getHistory:        ()     => request('/api/donor/history', {}, getToken()),
  toggleAvailability:(body) => request('/api/donor/availability', { method: 'PUT', body: JSON.stringify(body) }, getToken()),
};

// ════════════════════════════════════════════════════════════
// RECEIVER API
// ════════════════════════════════════════════════════════════
export const receiverApi = {
  // Profile CRUD
  createProfile: (body)   => request('/api/receiver/profile', { method: 'POST',   body: JSON.stringify(body) }, getToken()),
  getProfile:    ()       => request('/api/receiver/profile', {}, getToken()),
  updateProfile: (body)   => request('/api/receiver/profile', { method: 'PUT',    body: JSON.stringify(body) }, getToken()),
  deleteProfile: ()       => request('/api/receiver/profile', { method: 'DELETE' }, getToken()),

  // Donor Search (real-time)
  searchDonors:  (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/receiver/donors${qs ? '?' + qs : ''}`, {}, getToken());
  },

  // Blood Requests CRUD
  createRequest:        (body)      => request('/api/receiver/requests', { method: 'POST',   body: JSON.stringify(body) }, getToken()),
  getMyRequests:        ()          => request('/api/receiver/requests', {}, getToken()),
  getIncomingResponses: ()          => request('/api/receiver/incoming-responses', {}, getToken()),
  getRequestResponses:  (requestId) => request(`/api/receiver/requests/${requestId}/responses`, {}, getToken()),
  updateRequest:        (id, body)  => request(`/api/receiver/requests/${id}`, { method: 'PUT',    body: JSON.stringify(body) }, getToken()),
  deleteRequest:        (id)        => request(`/api/receiver/requests/${id}`, { method: 'DELETE' }, getToken()),

  // Medical Document Upload (Cloudinary / Verified Docs)
  uploadDocument:       (formData)  => request('/api/receiver/requests/upload-doc', { method: 'POST', body: formData }, getToken()),

  // Matching Donors & Broadcast Email
  getMatchingDonors:    (requestId) => request(`/api/receiver/requests/${requestId}/matching-donors`, {}, getToken()),
  broadcastEmail:       (requestId, donorIds = []) => request(`/api/receiver/requests/${requestId}/broadcast-email`, { method: 'POST', body: JSON.stringify({ donor_ids: donorIds }) }, getToken()),
  emailDonor:           (requestId, donorId, message = '') => request(`/api/receiver/requests/${requestId}/email-donor`, { method: 'POST', body: JSON.stringify({ donor_id: donorId, message }) }, getToken()),

  // Notifications
  getNotifications: () => request('/api/receiver/notifications', {}, getToken()),
};

// ════════════════════════════════════════════════════════════
// PUBLIC API (No authentication required)
// ════════════════════════════════════════════════════════════
export const publicApi = {
  getRequestById: (id) => request(`/api/public/requests/${id}`),
};

