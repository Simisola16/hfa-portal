import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    const params = new URLSearchParams(window.location.search);
    const impersonateCode = params.get('impersonate_code');

    if (impersonateCode) {
      setLoading(true);
      api.post('/api/auth/impersonate/exchange', { code: impersonateCode })
        .then(data => {
          localStorage.setItem('hfa_token', data.token);
          setUser(data.user);
          setProfile(data.user);
          window.history.replaceState({}, document.title, window.location.pathname);
          toast.success(`Impersonation active: Viewing as Admin`);
        })
        .catch(err => {
          toast.error(err.message || 'Failed to exchange impersonation code.');
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .finally(() => setLoading(false));
    } else if (token) {
      api.get('/api/auth/profile')
        .then(data => { 
          setUser(data.user); 
          setProfile(data.user); // In MongoDB, user and profile are the same document
        })
        .catch(() => { localStorage.removeItem('hfa_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('hfa_token', data.token); // Changed from data.session.access_token
    setUser(data.user);
    setProfile(data.user); // Merged in MongoDB
    return data;
  };

  const logout = () => {
    localStorage.removeItem('hfa_token');
    setUser(null);
    setProfile(null);
  };

  const endImpersonation = async () => {
    try {
      await api.post('/api/auth/impersonate/end');
    } catch (e) {}
    localStorage.removeItem('hfa_token');
    setUser(null);
    setProfile(null);
    toast.success('Impersonation session ended.');
    setTimeout(() => {
      window.location.href = '/login';
      try {
        window.close();
      } catch (e) {}
    }, 1000);
  };

  const updateProfile = (newProfile) => setProfile(newProfile);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, endImpersonation, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
