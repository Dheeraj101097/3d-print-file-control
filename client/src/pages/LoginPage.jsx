import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation, useRegisterMutation } from '../features/auth/authApi.js';
import { setCredentials } from '../features/auth/authSlice.js';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [register, { isLoading: isRegistering }] = useRegisterMutation();
  const isLoading = isLoggingIn || isRegistering;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = isRegister
        ? await register(form).unwrap()
        : await login({ email: form.email, password: form.password }).unwrap();
      dispatch(setCredentials(result));
      navigate('/');
    } catch (err) {
      toast.error(err.data?.message || (isRegister ? 'Registration failed' : 'Login failed'));
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--c-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* Ambient glow — matches Stitch dark atmosphere */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '480px',
          height: '480px',
          background: 'radial-gradient(circle, rgba(19, 64, 116, 0.30) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '380px',
          borderRadius: '16px',
          padding: '0',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '28px 28px 20px',
            borderBottom: '1px solid var(--c-border-soft)',
            background: 'linear-gradient(135deg, rgba(19, 64, 116, 0.15) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div
              style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-container) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>P</span>
            </div>
            <h1
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '1.25rem',
                color: 'var(--c-text)',
                letterSpacing: '-0.03em',
              }}
            >
              PrintVCS
            </h1>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-secondary)' }}>
            Version control for 3D printing assets
          </p>
        </div>

        {/* Tab switcher — matches Stitch segment control */}
        <div style={{ display: 'flex', padding: '16px 28px 0' }}>
          {['Login', 'Register'].map((label, i) => {
            const active = (i === 0 && !isRegister) || (i === 1 && isRegister);
            return (
              <button
                key={label}
                type="button"
                onClick={() => setIsRegister(i === 1)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: '0.8125rem',
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--c-text)' : 'var(--c-text-muted)',
                  borderBottom: active ? '2px solid var(--c-carolina)' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                  marginBottom: '-1px',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ height: '1px', background: 'var(--c-border-soft)', margin: '0 0 24px' }} />

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRegister && (
            <div>
              <label className="label-technical" style={{ display: 'block', marginBottom: '6px' }}>Display Name</label>
              <input
                type="text"
                placeholder="Your full name"
                required
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="input-field"
              />
            </div>
          )}
          <div>
            <label className="label-technical" style={{ display: 'block', marginBottom: '6px' }}>Email Address</label>
            <input
              type="email"
              placeholder="you@company.com"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-technical" style={{ display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
          >
            {isLoading ? 'Processing…' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
