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
          <div className="auth-logo-section">
            <img src="/hfa-logo.jpg" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <span className="auth-logo-text">Halal Food Authority</span>
          </div>

          <h1>Welcome to HFA Portal</h1>
          <p>Register, apply, submit, track the progress of application and download your certificate through the HFA certification portal.</p>
          
          <div className="user-guide-card">
            <h4>User's Guide</h4>
            <button className="btn-user-guide">
              <BookOpen size={18} /> Read User Guide
            </button>
          </div>

          <div className="auth-sidebar-footer">
            Developed by TheYoungPioneers
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
            <p>Enter your credentials to access the portal</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label>E-Mail <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="email"
                className="auth-input"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-input-group">
              <label>Your Password <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="••••••"
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <input type="checkbox" id="keep-logged" style={{ width: 16, height: 16 }} />
              <label htmlFor="keep-logged" style={{ margin: 0, fontSize: 13, color: '#64748b', cursor: 'pointer' }}>Keep me logged in</label>
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? <span className="spinner-white" /> : <><LogIn size={18} /> Login</>}
            </button>

            <div style={{ marginTop: 24 }}>
              <Link to="/forgot-password" style={{ color: '#1B7A7A', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

