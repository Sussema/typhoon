import React, { useState } from 'react';
import { api } from '../api/http.js';

export function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [phone, setPhone] = useState('+919876543210');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api('/auth/otp/request', {
        method: 'POST',
        body: { phone }
      });
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api('/auth/otp/verify', {
        method: 'POST',
        body: { phone, code }
      });
      if (res.user) {
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Incorrect OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>📱 OTP Login (Stage 10)</h3>
          <button onClick={onClose} style={{ minHeight: 32, padding: '0.25rem 0.5rem', background: 'transparent', color: 'var(--text-muted)' }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label>Mobile Number (Registered User)</label>
              <input
                type="tel"
                className="input-field mono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                required
                autoFocus
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Enter the phone number registered by your facility admin.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', minHeight: 48 }} disabled={loading}>
              {loading ? 'Sending SMS...' : 'Send 6-Digit OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            {devOtp && (
              <div style={{ padding: '0.75rem', background: 'var(--primary-light)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary-dark)', fontWeight: 600 }}>Simulated SMS Code:</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--primary)' }} className="mono">
                  {devOtp}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label>Enter 6-Digit Verification Code</label>
              <input
                type="text"
                className="input-field mono"
                style={{ fontSize: '1.3rem', letterSpacing: '0.2em', textAlign: 'center' }}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="------"
                required
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', minHeight: 48, marginBottom: '0.5rem' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Establish Session'}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', minHeight: 40 }}
              onClick={() => { setStep('phone'); setDevOtp(''); }}
            >
              Use Different Phone
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
