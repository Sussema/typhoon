import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/http.js';

export function AdminScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('stickers');
  const [stickerPrefix, setStickerPrefix] = useState('HOME');
  const [startNum, setStartNum] = useState(1);
  const [count, setCount] = useState(6);

  // DPDP Erasure state (Stage 13)
  const [eraseSubjectId, setEraseSubjectId] = useState('00000000-0000-0000-0000-000000000099');
  const [eraseResult, setEraseResult] = useState(null);
  const [erasing, setErasing] = useState(false);
  const [noticeLang, setNoticeLang] = useState('mr');

  const stickers = Array.from({ length: count }, (_, i) => {
    const num = startNum + i;
    const code = `${stickerPrefix}-${String(num).padStart(4, '0')}`;
    const qrPayload = stickerPrefix === 'HOME' ? `CL:H:${code}` : `CL:M:${code}`;
    return { code, qrPayload };
  });

  const handleErasePersonalData = async (e) => {
    e.preventDefault();
    if (!confirm(`DPDP Act Compliance: Are you sure you want to permanently erase all personal identifiable data for subject ${eraseSubjectId}? Material ledger transactions will retain pseudonymous continuity.`)) {
      return;
    }
    setErasing(true);
    setEraseResult(null);
    try {
      const res = await api(`/privacy/erase/${eraseSubjectId}`, { method: 'DELETE' });
      setEraseResult(res);
    } catch (err) {
      alert(`Erasure error: ${err.message}`);
    } finally {
      setErasing(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '1.5rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'stickers' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('stickers')}
        >
          🏷️ QR Sticker Generator (Stage 7)
        </button>
        <button
          className={`btn ${activeTab === 'master' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('master')}
        >
          🏢 Master Facilities & Worker Registry
        </button>
        <button
          className={`btn ${activeTab === 'privacy' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('privacy')}
        >
          🛡️ DPDP Privacy & Erasure Rights (Stage 13)
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

      {activeTab === 'privacy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* DPDP Legal Erasure Card */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              🛡️ DPDP Act, 2023: Right to Erasure Enforcement
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Section 18.1: Erase personal identifiable data on request by deleting the <code>people_private</code> row. The append-only material ledger retains pseudonymous continuity without breaking mathematical balances.
            </p>

            <form onSubmit={handleErasePersonalData} style={{ maxWidth: 500 }}>
              <div style={{ marginBottom: '1rem' }}>
                <label>Data Subject ID (Worker / Household UUID)</label>
                <input
                  type="text"
                  className="input-field mono"
                  value={eraseSubjectId}
                  onChange={(e) => setEraseSubjectId(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-outline"
                style={{ borderColor: '#ef4444', color: '#dc2626', fontWeight: 700 }}
                disabled={erasing}
              >
                {erasing ? 'Purging Personal Records...' : '🗑️ Permanently Erase Personal Data (people_private)'}
              </button>
            </form>

            {eraseResult && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, color: '#065f46' }}>✓ DPDP Erasure Verified:</div>
                <div style={{ fontSize: '0.85rem', color: '#047857', marginTop: '0.25rem' }}>
                  {eraseResult.message}
                </div>
              </div>
            )}
          </div>

          {/* Multilingual Consent Notice */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                📜 Multilingual Notice & Consent Disclosure (Section 18.1)
              </h3>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  className={`btn ${noticeLang === 'mr' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ minHeight: 30, fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setNoticeLang('mr')}
                >
                  मराठी
                </button>
                <button
                  className={`btn ${noticeLang === 'hi' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ minHeight: 30, fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setNoticeLang('hi')}
                >
                  हिंदी
                </button>
                <button
                  className={`btn ${noticeLang === 'en' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ minHeight: 30, fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setNoticeLang('en')}
                >
                  English
                </button>
              </div>
            </div>

            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              {noticeLang === 'mr' && (
                <div>
                  <h4 style={{ fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>
                    डेटा गोपनीयता आणि संमती सूचना (DPDP कायदा, २०२३)
                  </h4>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                    आम्ही फक्त तुमचा मोबाइल क्रमांक आणि घरचा QR कोड कचरा वर्गीकरण आणि बक्षीस वितरणासाठी वापरतो. <strong>आम्ही आधार क्रमांक कधीही मागत नाही.</strong> तुम्ही तुमची माहिती कधीही काढून घेण्याचा अधिकार बाळगता.
                  </p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    तक्रार निवारण अधिकारी: Solid Waste Management Directorate · helpline: 1800-233-0193
                  </div>
                </div>
              )}
              {noticeLang === 'hi' && (
                <div>
                  <h4 style={{ fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>
                    डेटा गोपनीयता और सहमति सूचना (DPDP अधिनियम, 2023)
                  </h4>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                    हम केवल आपका मोबाइल नंबर और घर का क्यूआर कोड कचरा पृथक्करण और प्रोत्साहन रिकॉर्ड के लिए एकत्र करते हैं। <strong>हम कभी भी आधार नंबर नहीं मांगते।</strong> आपके अनुरोध पर व्यक्तिगत पहचान डेटा तुरंत मिटा दिया जाएगा।
                  </p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    शिकायत निवारण अधिकारी: Solid Waste Management Directorate · helpline: 1800-233-0193
                  </div>
                </div>
              )}
              {noticeLang === 'en' && (
                <div>
                  <h4 style={{ fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>
                    Data Privacy & Consent Notice (DPDP Act, 2023)
                  </h4>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                    We only collect your phone number and pseudonymous QR identifier for segregated waste tracking and reward points. <strong>We NEVER collect Aadhaar numbers.</strong> You retain the legal right to revoke consent and erase personal identity records.
                  </p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Data Protection & Grievance Officer: grievance.circularlink@pune.gov.in · Helpline: 1800-233-0193
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: '#92400e' }}>
              ⚠️ <strong>Statutory Limit (Section 18.2 & 18.3):</strong> CircularLink records weights and agreed rates ("Payment record", not "payment sent"). Evidence packs provide verified traceability data for CPCB portal reporting; no unapproved self-certificates are issued.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
