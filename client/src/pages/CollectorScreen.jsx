import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submit } from '../offline/outbox.js';

export function CollectorScreen() {
  const { t } = useTranslation();
  const [householdCode, setHouseholdCode] = useState('HOME-0193');
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickup = async (result, points) => {
    setIsSaving(true);
    try {
      const payload = {
        householdId: '00000000-0000-0000-0000-000000000101',
        workerId: '00000000-0000-0000-0000-000000000002',
        result
      };

      await submit('/pickups', payload);
      setLastSaved({
        code: householdCode,
        result,
        points,
        time: new Date().toLocaleTimeString()
      });

      // Auto-advance to next household demo
      const num = parseInt(householdCode.replace('HOME-', ''), 10) || 1;
      setHouseholdCode(`HOME-${String(num + 1).padStart(4, '0')}`);
    } catch (err) {
      alert(`Error saving pickup: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '1.5rem auto', padding: '0 1rem' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>🚶 {t('collector')}</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Ward 12 · Route Morning A</p>
          </div>
          <span className="badge badge-info">Step 4: Doorstep Pickup</span>
        </div>

        {/* Household Identifier Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label>Household QR / ID</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="input-field mono"
              value={householdCode}
              onChange={(e) => setHouseholdCode(e.target.value)}
              placeholder="e.g. HOME-0193"
            />
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => alert(`Simulated QR Scanner: Scanned ${householdCode}`)}
              title="Scan QR Sticker"
            >
              📷 {t('scan_qr')}
            </button>
          </div>
        </div>

        {/* Four Large Touch Target Buttons for Segregation Quality */}
        <label style={{ marginBottom: '0.75rem' }}>Segregation Inspection Result</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-success"
            style={{ flexDirection: 'column', height: 90, fontSize: '1.1rem' }}
            disabled={isSaving}
            onClick={() => handlePickup('correct', 20)}
          >
            <span>✅ Complete Segregation</span>
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>+20 Household Points</span>
          </button>

          <button
            type="button"
            className="btn btn-warning"
            style={{ flexDirection: 'column', height: 90, fontSize: '1.1rem' }}
            disabled={isSaving}
            onClick={() => handlePickup('partial', 10)}
          >
            <span>⚠️ Partial Segregation</span>
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>+10 Household Points</span>
          </button>

          <button
            type="button"
            className="btn btn-danger"
            style={{ flexDirection: 'column', height: 90, fontSize: '1.1rem' }}
            disabled={isSaving}
            onClick={() => handlePickup('incorrect', 0)}
          >
            <span>❌ Mixed / Contaminated</span>
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>0 Points (Feedback Sent)</span>
          </button>

          <button
            type="button"
            className="btn btn-neutral"
            style={{ flexDirection: 'column', height: 90, fontSize: '1.1rem' }}
            disabled={isSaving}
            onClick={() => handlePickup('no_waste', 0)}
          >
            <span>🚪 No Waste Available</span>
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>0 Points (Streak Kept)</span>
          </button>
        </div>

        {/* Feedback Confirmation */}
        {lastSaved && (
          <div style={{
            padding: '1rem',
            background: 'var(--primary-light)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                Recorded for {lastSaved.code}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Result: <strong>{lastSaved.result}</strong> ({lastSaved.points} pts) at {lastSaved.time}
              </div>
            </div>
            <span className="badge badge-success">Saved to Outbox</span>
          </div>
        )}
      </div>
    </div>
  );
}
