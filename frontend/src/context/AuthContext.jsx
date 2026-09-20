// src/context/AuthContext.jsx
// Global auth state: JWT token, user info, role, profileComplete flag

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);   // { id, full_name, email, role, profileComplete }
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);   // true on first load (reading localStorage)

  // ── Restore session on page refresh ──────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('hemolink_token');
    const savedUser  = localStorage.getItem('hemolink_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('hemolink_token');
        localStorage.removeItem('hemolink_user');
      }
    }
    setLoading(false);
  }, []);

  // ── Login: save token + user to state and localStorage ───
  const login = useCallback((tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    localStorage.setItem('hemolink_token', tokenValue);
    localStorage.setItem('hemolink_user',  JSON.stringify(userData));
  }, []);

  // ── Update user (e.g. after profile completion) ───────────
  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('hemolink_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── Logout ────────────────────────────────────────────────
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('hemolink_token');
    localStorage.removeItem('hemolink_user');
  }, []);

  const isAuthenticated   = Boolean(token && user);
  const isDonor           = user?.role === 'donor';
  const isReceiver        = user?.role === 'receiver';
  const profileComplete   = user?.profileComplete ?? false;

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      isAuthenticated, isDonor, isReceiver, profileComplete,
      login, logout, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use this everywhere instead of importing AuthContext directly
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
