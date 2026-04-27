import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Left Sidebar */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-content">
          <div className="auth-logo-badge">🕌</div>
          <h1>Halal Food Authority Certification Portal</h1>
          <p>Welcome to HFA Certification Portal. Register, apply, submit, track the progress of application and download your certificate through the HFA certification portal.</p>
          
          <div className="user-guide-box">
            <div className="user-guide-icon">📖</div>
            <div className="user-guide-text">
              <h4>Portal User's Guide</h4>
              <p>Download our manual for help</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Auth Area */}
      <div className="auth-main">
        <div className="auth-tabs">
          <div className="auth-tab active">Login</div>
          <Link to="/register" className="auth-tab">Register</Link>
        </div>

        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Login to Your Account</h2>
            <p>Enter your details to access your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label>Email Address</label>
              <input
                type="email"
                className="auth-input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <Link to="/forgot-password" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="auth-btn-primary w-full" disabled={loading}>
              {loading ? <span className="spinner-white" /> : <><LogIn size={18} /> Login</>}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          <p style={{ marginBottom: 4 }}>HFA is a part of the Halal Food Foundation (Registered Charity Number: 1139457)</p>
          <p>© {new Date().getFullYear()} Halal Food Authority. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

