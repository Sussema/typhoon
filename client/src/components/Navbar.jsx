import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../offline/outbox.js';
import { LoginModal } from './LoginModal.jsx';
import { api } from '../api/http.js';

export function Navbar({ activeRole, setActiveRole, currentUser, setCurrentUser }) {
  const { t, i18n } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkOutbox = async () => {
      try {
        const count = await db.outbox.count();
        setPendingCount(count);
      } catch (e) {}
    };

    checkOutbox();
    const interval = setInterval(checkOutbox, 4000);

    // Check existing session
    api('/auth/me')
      .then((res) => {
        if (res.user && res.user.authenticated) {
          setCurrentUser(res.user);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (e) {}
    setCurrentUser(null);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('lang', lng);
  };

  const roles = [
    { id: 'collector', label: t('collector'), icon: '🚶' },
    { id: 'aggregator', label: t('aggregator'), icon: '⚖️' },
    { id: 'facility_operator', label: t('facility_operator'), icon: '🏭' },
    { id: 'recycler', label: t('recycler'), icon: '♻️' },
    { id: 'municipal_viewer', label: t('municipal_viewer'), icon: '🏛️' },
    { id: 'admin', label: t('admin'), icon: '⚙️' }
  ];

  return (
    <header style={{
      background: 'white',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #125e3b, #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '1.25rem'
          }}>
            CL
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary-dark)', letterSpacing: '-0.02em' }}>
              CircularLink
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Team Typhoon · MITSUI-PS-01
            </div>
          </div>
        </div>

        {/* Status badges & Language */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Online/Offline Badge */}
          <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isOnline ? '#166534' : '#991b1b',
              display: 'inline-block'
            }}></span>
            {isOnline ? 'Online' : 'Offline'}
          </span>

          {/* Pending Sync Count */}
          {pendingCount > 0 && (
            <span className="badge badge-warning" title="Records waiting in IndexedDB outbox">
              ⚡ {pendingCount} waiting
            </span>
          )}

          {/* Auth Status & Login Button */}
          {currentUser?.authenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #a7f3d0' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#065f46' }}>
                👤 {currentUser.phone ? currentUser.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2') : 'User'} ({currentUser.role})
              </span>
              <button
                onClick={handleLogout}
                style={{
                  minHeight: 28,
                  padding: '0.15rem 0.45rem',
                  fontSize: '0.75rem',
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600
                }}
                title="Log out session"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="btn btn-outline"
              style={{ minHeight: 32, padding: '0.25rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}
            >
              🔑 Login (OTP)
            </button>
          )}

          {/* Language Selector */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-muted)', padding: '0.2rem', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => changeLanguage('mr')}
              style={{
                minHeight: 32,
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                background: i18n.language === 'mr' ? 'white' : 'transparent',
                boxShadow: i18n.language === 'mr' ? 'var(--shadow-sm)' : 'none',
                color: i18n.language === 'mr' ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              मराठी
            </button>
            <button
              onClick={() => changeLanguage('hi')}
              style={{
                minHeight: 32,
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                background: i18n.language === 'hi' ? 'white' : 'transparent',
                boxShadow: i18n.language === 'hi' ? 'var(--shadow-sm)' : 'none',
                color: i18n.language === 'hi' ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              हिंदी
            </button>
            <button
              onClick={() => changeLanguage('en')}
              style={{
                minHeight: 32,
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                background: i18n.language === 'en' ? 'white' : 'transparent',
                boxShadow: i18n.language === 'en' ? 'white' : 'none',
                color: i18n.language === 'en' ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Role Navigation Bar */}
      <div style={{
        background: 'var(--bg-muted)',
        borderTop: '1px solid var(--border)',
        overflowX: 'auto',
        display: 'flex',
        padding: '0.35rem 1rem',
        gap: '0.5rem'
      }}>
        {roles.map((r) => {
          const active = activeRole === r.id;
          return (
            <button
              key={r.id}
              onClick={() => {
                setActiveRole(r.id);
                localStorage.setItem('cl_active_role', r.id);
              }}
              style={{
                minHeight: 38,
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-full)',
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'white' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                fontWeight: active ? 700 : 500
              }}
            >
              <span>{r.icon}</span>
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          if (u.role) setActiveRole(u.role);
        }}
      />
    </header>
  );
}
