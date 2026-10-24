import React, { useEffect, useState } from 'react';
import { scanOnce } from './scan.js';

export function QRScannerModal({ isOpen, onClose, onScan, expectedPrefix = 'CL:H:', title = 'Scan QR Sticker' }) {
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setManualCode('');
      return;
    }

    let active = true;

    // Start scanner on element #qr-reader
    const startScanner = async () => {
      try {
        const result = await scanOnce('qr-reader', expectedPrefix);
        if (active) {
          onScan(result);
          onClose();
        }
      } catch (err) {
        if (active) {
          setError('Camera permission denied or camera unavailable. Please enter the sticker code manually.');
        }
      }
    };

    // Small delay to ensure modal DOM element is rendered
    const timer = setTimeout(startScanner, 100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, expectedPrefix]);

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim().toUpperCase());
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div className="card" style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              minHeight: 32,
              padding: '0.25rem 0.5rem',
              background: 'transparent',
              fontSize: '1.25rem',
              color: 'var(--text-muted)'
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Point camera at sticker with prefix <strong className="mono">{expectedPrefix}</strong>
        </p>

        {/* Viewfinder element */}
        {!error && (
          <div
            id="qr-reader"
            style={{
              width: '100%',
              minHeight: 250,
              backgroundColor: '#000',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}
          ></div>
        )}

        {/* Manual entry fallback if camera is unavailable or denied (Page 32 requirement) */}
        {error && (
          <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #f87171', borderRadius: 'var(--radius-md)', marginBottom: '1rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: '0.75rem' }}>{error}</p>
            <form onSubmit={handleManualSubmit}>
              <label>Type Code under QR (e.g. HOME-0193)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input-field mono"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="HOME-0193"
                  autoFocus
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ minHeight: 48 }}>
                  Submit
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Weatherproof Vinyl Sticker Scanning
          </span>
          <button type="button" className="btn btn-outline" style={{ minHeight: 36, padding: '0.25rem 0.75rem' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
