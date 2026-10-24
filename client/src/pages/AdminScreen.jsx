import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function AdminScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('stickers');
  const [stickerPrefix, setStickerPrefix] = useState('HOME');
  const [startNum, setStartNum] = useState(1);
  const [count, setCount] = useState(6);

  const stickers = Array.from({ length: count }, (_, i) => {
    const num = startNum + i;
    const code = `${stickerPrefix}-${String(num).padStart(4, '0')}`;
    const qrPayload = stickerPrefix === 'HOME' ? `CL:H:${code}` : `CL:M:${code}`;
    return { code, qrPayload };
  });

  return (
    <div style={{ maxWidth: 900, margin: '1.5rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          className={`btn ${activeTab === 'stickers' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('stickers')}
        >
          🏷️ QR Sticker Generator & Printing (Stage 7)
        </button>
        <button
          className={`btn ${activeTab === 'master' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('master')}
        >
          🏢 Master Facilities & Worker Registry
        </button>
      </div>

      {activeTab === 'stickers' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>🏷️ Batch QR Sticker Generator</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Complies with Section 12.1: Opaque prefix codes only. Never encodes personal data.
              </p>
            </div>
            <button className="btn btn-outline" onClick={() => window.print()}>
              🖨️ Print Sticker Sheet
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label>Target Entity</label>
              <select className="input-field" value={stickerPrefix} onChange={(e) => setStickerPrefix(e.target.value)}>
                <option value="HOME">Households (CL:H:HOME-XXXX)</option>
                <option value="MCH">Facility Machines (CL:M:MCH-XXXX)</option>
              </select>
            </div>
            <div>
              <label>Starting Number</label>
              <input type="number" min="1" className="input-field mono" value={startNum} onChange={(e) => setStartNum(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div>
              <label>Quantity per Sheet</label>
              <input type="number" min="1" max="24" className="input-field mono" value={count} onChange={(e) => setCount(parseInt(e.target.value, 10) || 6)} />
            </div>
          </div>

          {/* Sticker Grid Preview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}>
            {stickers.map((s, idx) => (
              <div
                key={idx}
                style={{
                  background: 'white',
                  border: '2px dashed #94a3b8',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                {/* SVG QR Code Simulation */}
                <div style={{
                  width: 120,
                  height: 120,
                  backgroundColor: '#f1f5f9',
                  border: '2px solid #0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ fontSize: '2rem' }}>📱</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', wordBreak: 'break-all' }} className="mono">
                    {s.qrPayload}
                  </div>
                </div>

                <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em' }} className="mono">
                  {s.code}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  CircularLink · Weatherproof Vinyl
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            * Note from Section 12.2: Codes are printed as readable text under the QR so workers can manually type them if damaged.
          </p>
        </div>
      )}

      {activeTab === 'master' && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>🏢 Master Registry (DPDP Privacy Compliant)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Partner Facilities (facilities)</h3>
              <ul style={{ listStyle: 'none', fontSize: '0.875rem' }}>
                <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                  <strong>FAC-PUN-01:</strong> Central MRF Line A (Municipal)
                </li>
                <li style={{ padding: '0.35rem 0' }}>
                  <strong>FAC-PUN-02:</strong> EcoShred Baler Depot (Private)
                </li>
              </ul>
            </div>

            <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Registered Workers (workers)</h3>
              <ul style={{ listStyle: 'none', fontSize: '0.875rem' }}>
                <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                  <strong>WRK-0014:</strong> Service Area: Ward 12 (Assigned: 84 Homes)
                </li>
                <li style={{ padding: '0.35rem 0' }}>
                  <strong>WRK-0015:</strong> Service Area: Ward 14 (Assigned: 92 Homes)
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
