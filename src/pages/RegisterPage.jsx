import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ArrowLeft, UserPlus, Building2, User, Lock, Globe, Check, BookOpen } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    company_name: '',
    company_phone: '',
    full_name: '',
    country: 'United Kingdom (UK)',
    contact_phone: '',
    email: '',
    password: '',
    confirm_password: '',
    declared: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const nextStep = () => {
    if (step === 1) {
      if (!form.company_name || !form.company_phone || !form.full_name || !form.contact_phone) {
        return toast.error('Please fill in all required fields');
      }
    }
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (!form.declared) return toast.error('Please accept the declaration');
    
    setLoading(true);
    try {
      await api.post('/api/auth/register', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        company_name: form.company_name,
        phone: form.contact_phone,
        company_phone: form.company_phone,
        country: form.country
      });
      toast.success('Account created! Please check your email.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Left Sidebar */}
        <div className="auth-sidebar">
          <div className="auth-sidebar-content">
            <div className="auth-logo-section">
              <img src="/hfa-logo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <span className="auth-logo-text">Halal Food Authority</span>
            </div>

            <h1>Welcome to HFA Portal</h1>
            <p>Register your account as Halal Food Authority Applicant to enjoy our service. Track your application and download certificates instantly.</p>
            
            <div className="user-guide-card">
              <h4 style={{ color: 'white', marginBottom: 12 }}>User's Guide</h4>
              <button className="btn-user-guide">
                <BookOpen size={16} /> Read User Guide
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
            <Link to="/login" className="auth-tab">Login</Link>
            <div className="auth-tab active">Register</div>
          </div>

          <div className="auth-form-container">
            <div className="auth-form-header">
              <h2>Create Your Account</h2>
              <p>Step {step} of 2: {step === 1 ? 'Business Information' : 'Login Credentials'}</p>
            </div>

            {/* Stepper */}
            <div className="stepper" style={{ marginBottom: 32 }}>
              <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                <div className="step-circle">{step > 1 ? <Check size={16} /> : '1'}</div>
                <span className="step-label">Business</span>
              </div>
              <div className={`step ${step >= 2 ? 'active' : ''}`}>
                <div className="step-circle">2</div>
                <span className="step-label">Account</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <div className="step-content">
                  <div className="auth-input-group">
                    <label>Company Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" className="auth-input" value={form.company_name} onChange={set('company_name')} placeholder="e.g. Acme Foods Ltd" required />
                  </div>
                  <div className="auth-input-group">
                    <label>Company Phone <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" className="auth-input" value={form.company_phone} onChange={set('company_phone')} placeholder="e.g. +44 20 7123 4567" required />
                  </div>
                  <div className="auth-input-group">
                    <label>Contact Person Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" className="auth-input" value={form.full_name} onChange={set('full_name')} placeholder="e.g. John Doe" required />
                  </div>
                  <div className="auth-input-group">
                    <label>Contact Person Phone <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" className="auth-input" value={form.contact_phone} onChange={set('contact_phone')} placeholder="e.g. +44 7700 900123" required />
                  </div>
                  <div className="auth-input-group">
                    <label>Country <span style={{ color: '#ef4444' }}>*</span></label>
                    <select className="auth-input" value={form.country} onChange={set('country')}>
                      <option value="United Kingdom (UK)">United Kingdom (UK)</option>
                      <option value="Ireland">Ireland</option>
                      <option value="France">France</option>
                      <option value="Germany">Germany</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <button type="button" onClick={nextStep} className="auth-btn-primary">
                    Next Step <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="step-content">
                  <div className="auth-input-group">
                    <label>Login Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="email" className="auth-input" value={form.email} onChange={set('email')} placeholder="your@email.com" required />
                  </div>
                  <div className="auth-input-group">
                    <label>Password <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'} className="auth-input" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="auth-input-group">
                    <label>Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="password" className="auth-input" value={form.confirm_password} onChange={set('confirm_password')} placeholder="Repeat password" required />
                  </div>

                  <div className="auth-input-group" style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', gap: 12, cursor: 'pointer', marginBottom: 0, fontWeight: 500, lineHeight: 1.4 }}>
                      <input type="checkbox" checked={form.declared} onChange={set('declared')} style={{ width: 18, height: 18, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: '#64748b' }}>I hereby declare that the above information is true and correct to the best of my knowledge and belief. <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button type="button" onClick={prevStep} className="btn-ghost" style={{ flex: 1, padding: 12 }}>
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button type="submit" className="auth-btn-primary" style={{ flex: 2 }} disabled={loading}>
                      {loading ? <span className="spinner-white" /> : <><UserPlus size={18} /> Register Now</>}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}



