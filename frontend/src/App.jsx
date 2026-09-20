// src/App.jsx — Unified routing for the entire HemoLink app

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth pages
import Login          from './pages/auth/Login';
import Signup         from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword  from './pages/auth/ResetPassword';

// Public emergency request page (sharable without login)
import PublicRequestView from './pages/public/PublicRequestView';

// Donor pages
import DonorDashboard from './pages/donor/DonorDashboard';
import DonorRequests  from './pages/donor/DonorRequests';
import DonorHistory   from './pages/donor/DonorHistory';
import DonorProfile   from './pages/donor/DonorProfile';

// Receiver pages
import ReceiverDashboard from './pages/receiver/ReceiverDashboard';
import SearchDonors      from './pages/receiver/SearchDonors';
import SendRequest       from './pages/receiver/SendRequest';
import MyRequests        from './pages/receiver/MyRequests';
import ReceiverProfile   from './pages/receiver/ReceiverProfile';

// Guards
import ProtectedRoute from './components/common/ProtectedRoute';

// ─── Root redirect based on auth state ────────────────────
function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user.role === 'donor'
    ? <Navigate to="/donor/dashboard"    replace />
    : <Navigate to="/receiver/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Routes (No authentication required) */}
      <Route path="/login"           element={<Login />} />
      <Route path="/signup"          element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />
      <Route path="/request/:id"     element={<PublicRequestView />} />

      {/* ── DONOR Protected Routes ── */}
      <Route element={<ProtectedRoute allowedRole="donor" />}>
        <Route path="/donor/dashboard" element={<DonorDashboard />} />
        <Route path="/donor/requests"  element={<DonorRequests />} />
        <Route path="/donor/history"   element={<DonorHistory />} />
        <Route path="/donor/profile"   element={<DonorProfile />} />
      </Route>

      {/* ── RECEIVER Protected Routes ── */}
      <Route element={<ProtectedRoute allowedRole="receiver" />}>
        <Route path="/receiver/dashboard" element={<ReceiverDashboard />} />
        <Route path="/receiver/donors"    element={<SearchDonors />} />
        <Route path="/receiver/request"   element={<SendRequest />} />
        <Route path="/receiver/requests"  element={<MyRequests />} />
        <Route path="/receiver/profile"   element={<ReceiverProfile />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
