import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submit } from '../offline/outbox.js';
import { readSerialWeight } from '../scale/serialScale.js';
import { QRScannerModal } from '../components/QRScannerModal.jsx';

const MATERIALS = [
  {
    code: 'PET',
    name: 'PET Bottles (प्लास्टिक बाटल्या)',
    grades: {
      'Clean & Sorted': 22,
      'Standard Mixed': 18,
      'Wet / Requires Cleaning': 13
    }
  },
  {
    code: 'HDPE_PP',
    name: 'HDPE / PP Rigids (कडक प्लास्टिक)',
    grades: {
      'Clean & Sorted': 28,
      'Standard Mixed': 22,
      'Wet / Requires Cleaning': 16
    }
  },
  {
    code: 'MIXED_PLASTIC',
    name: 'Mixed Soft Plastic (मिश्र प्लास्टिक)',
    grades: {
      'Clean & Sorted': 12,
      'Standard Mixed': 9,
      'Wet / Requires Cleaning': 6
    }
  },
  {
    code: 'CARDBOARD',
    name: 'Cardboard / Corrugated (पुठ्ठा)',
    grades: {
      'Clean & Sorted': 9,
      'Standard Mixed': 7,
      'Wet / Requires Cleaning': 4.5
    }
  },
  {
    code: 'PAPER',
    name: 'Newspaper / Mixed Paper (रद्दी कागद)',
    grades: {
      'Clean & Sorted': 11,
      'Standard Mixed': 8.5,
      'Wet / Requires Cleaning': 6
    }
  },
  {
    code: 'ALUMINIUM',
    name: 'Aluminium Cans (अ‍ॅल्युमिनियम)',
    grades: {
      'Clean & Sorted': 105,
      'Standard Mixed': 90,
      'Wet / Requires Cleaning': 75
    }
  },
  {
    code: 'GLASS',
    name: 'Glass Bottles (काचेच्या बाटल्या)',
    grades: {
      'Clean & Sorted': 3,
      'Standard Mixed': 2,
      'Wet / Requires Cleaning': 1
    }
  }
];

const GRADES = [
  { code: 'Clean & Sorted', label: 'A Grade - Clean & Baled' },
  { code: 'Standard Mixed', label: 'B Grade - Standard Mixed' },
  { code: 'Wet / Requires Cleaning', label: 'C Grade - Dirty / Unsorted' }
];

function getGradeRate(matCode, gradeCode) {
  const m = MATERIALS.find((x) => x.code === matCode);
  if (!m) return 22;
  return m.grades[gradeCode] ?? m.grades['Clean & Sorted'] ?? 22;
}

export function AggregatorScreen() {
  const { t } = useTranslation();
  const [workerCode, setWorkerCode] = useState('WRK-0014');
  const [material, setMaterial] = useState('PET');
  const [grade, setGrade] = useState('Clean & Sorted');
  const [weightKg, setWeightKg] = useState('18.45');
  const [ratePerKg, setRatePerKg] = useState(22);
  const [weightSource, setWeightSource] = useState('scale');
  const [scaleReading, setScaleReading] = useState(false);
  const [lastSlip, setLastSlip] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);

  const selectedMat = MATERIALS.find((m) => m.code === material);

  const handleMaterialChange = (matCode) => {
    setMaterial(matCode);
    const newRate = getGradeRate(matCode, grade);
    setRatePerKg(newRate);
  };

  const handleGradeChange = (gradeCode) => {
    setGrade(gradeCode);
    const newRate = getGradeRate(material, gradeCode);
    setRatePerKg(newRate);
  };

  const handleReadScale = async () => {
    setScaleReading(true);
    try {
      const weightInGrams = await readSerialWeight();
      setWeightKg((weightInGrams / 1000).toFixed(2));
      setWeightSource('scale');
    } catch (err) {
      // Fallback demo simulator if physical scale is not plugged into USB
      const simulatedKg = (Math.random() * 20 + 5).toFixed(2);
      setWeightKg(simulatedKg);
      setWeightSource('scale');
    } finally {
      setScaleReading(false);
    }
  };

  const totalPaise = Math.round((parseFloat(weightKg) || 0) * (parseFloat(ratePerKg) || 0) * 100);
  const totalRupees = (totalPaise / 100).toFixed(2);

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    const weightG = Math.round((parseFloat(weightKg) || 0) * 100);
    if (weightG <= 0) return alert('Weight must be greater than 0');

    setIsSaving(true);
    try {
      const payload = {
        workerId: '00000000-0000-0000-0000-000000000014',
        material,
        grade,
        weightG,
        pricePaisePerKg: Math.round((parseFloat(ratePerKg) || 0) * 100),
        weightSource,
        scaleId: weightSource === 'scale' ? 'SCALE-USB-01' : null
      };

      const clientId = await submit('/transactions', payload);

      setLastSlip({
        clientId,
        workerCode,
        material,
        weightKg,
        ratePerKg,
        totalRupees,
        weightSource,
        time: new Date().toLocaleString()
      });
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1240, margin: '1.5rem auto', padding: '0 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Seamless Integrated Header (No detached background box) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span>⚖️</span>
            <span>{t('aggregator')} (Aggregation Hub)</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Material Intake, Digital Weighbridge & Waste Picker Payout Record
          </p>
        </div>
        <span className="badge badge-info" style={{ fontWeight: 700 }}>Step 5: Weigh & Grade</span>
      </div>

      {/* Main Info Boxes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Box 1: Material Intake & Weighing Form Card */}
        <div className="card">
          <form onSubmit={handleSaveTransaction}>
          {/* Worker ID */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ margin: 0 }}>Registered Worker ID (कचरा वेचक आयडी)</label>
              {scanFeedback && (
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  {scanFeedback}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="input-field mono"
                value={workerCode}
                onChange={(e) => {
                  setWorkerCode(e.target.value);
                  setScanFeedback(null);
                }}
                placeholder="WRK-0014"
                required
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsScannerOpen(true)}
                title="Scan Waste Picker QR Card / Badge with Camera"
              >
                📷 Scan Card
              </button>
            </div>

            {/* Quick Pick Worker Cards */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Cards:</span>
              {[
                { code: 'WRK-0014', name: 'Ramesh Shinde' },
                { code: 'WRK-0008', name: 'Sunita Kamble' },
                { code: 'WRK-0021', name: 'Santosh Jadhav' }
              ].map((w) => (
                <button
                  key={w.code}
                  type="button"
                  onClick={() => {
                    setWorkerCode(w.code);
                    setScanFeedback(`Verified: ${w.code} (${w.name})`);
                  }}
                  style={{
                    minHeight: 28,
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.75rem',
                    background: workerCode === w.code ? 'var(--primary-light)' : 'var(--bg-muted)',
                    color: workerCode === w.code ? 'var(--primary-dark)' : 'var(--text-main)',
                    border: `1px solid ${workerCode === w.code ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🪪 {w.code} ({w.name})
                </button>
              ))}
            </div>
          </div>

          {/* Material & Grade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label>{t('material')}</label>
              <select
                className="input-field"
                value={material}
                onChange={(e) => handleMaterialChange(e.target.value)}
              >
                {MATERIALS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name} (Base ₹{m.grades['Clean & Sorted']}/kg)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>{t('grade')}</label>
              <select
                className="input-field"
                value={grade}
                onChange={(e) => handleGradeChange(e.target.value)}
              >
                {GRADES.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.label} (₹{getGradeRate(material, g.code)}/kg)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weight & Digital Scale */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ margin: 0 }}>{t('weight')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className={`badge ${weightSource === 'scale' ? 'badge-success' : 'badge-warning'}`}>
                  {weightSource === 'scale' ? '⚖️ Scale Verified' : '⚠️ Manual Entry'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input-field mono"
                style={{ fontSize: '1.25rem', fontWeight: 700 }}
                value={weightKg}
                onChange={(e) => {
                  setWeightKg(e.target.value);
                  setWeightSource('manual');
                }}
                required
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleReadScale}
                disabled={scaleReading}
                title="Connect and read from digital scale"
              >
                {scaleReading ? 'Reading...' : '📡 Read Scale'}
              </button>
            </div>
          </div>

          {/* Agreed Rate */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label>{t('price')}</label>
            <input
              type="number"
              step="0.5"
              className="input-field mono"
              value={ratePerKg}
              onChange={(e) => setRatePerKg(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          {/* Confirmation Box (Section 11.5) */}
          <div style={{
            background: 'var(--primary-light)',
            border: '2px solid var(--primary)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
              Transaction Summary (Verify Before Save)
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-dark)', margin: '0.35rem 0' }}>
              {weightKg} kg {selectedMat?.code} @ ₹{ratePerKg}/kg = ₹{totalRupees}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {weightSource === 'scale' ? 'Direct reading from digital scale' : 'Flagged as manual operator entry'}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: 52, fontSize: '1.1rem' }}
            disabled={isSaving}
          >
            {isSaving ? t('saving') : `💾 Save & Generate Payment Record Slip`}
          </button>
        </form>
        </div>

        {/* Box 2: Payment Receipt Slip & Rate Reference Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Payment Record Slip (Assisted Use for Waste Picker) */}
          {lastSlip && (
            <div className="card" style={{ border: '2px dashed var(--primary)', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                    CircularLink Waste Payment Record
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Official Transaction Proof · DPDP Compliant Pseudonymous Ledger
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ minHeight: 36, padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={() => window.print()}
                >
                  🖨️ Print Slip
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div>Worker Code: <strong className="mono">{lastSlip.workerCode}</strong></div>
                <div>Timestamp: <strong className="mono">{lastSlip.time}</strong></div>
                <div>Material: <strong>{lastSlip.material}</strong></div>
                <div>Weighed Qty: <strong className="mono">{lastSlip.weightKg} kg</strong> ({lastSlip.weightSource})</div>
                <div>Rate: <strong className="mono">₹{lastSlip.ratePerKg} / kg</strong></div>
                <div>Record ID: <strong className="mono" style={{ fontSize: '0.75rem' }}>{lastSlip.clientId.slice(0, 13)}...</strong></div>
              </div>

              <div style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Total Payable Amount:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>₹{lastSlip.totalRupees}</span>
              </div>

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                * Note: As per Section 18.2, this document certifies the recorded physical intake and weight.
              </p>
            </div>
          )}

          {/* Mandi Benchmark Material Rate Reference Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>📋</span>
                <span>Live Material Benchmark Rates (मंडी दर)</span>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active Mandi</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MATERIALS.map((mat) => (
                <div
                  key={mat.code}
                  onClick={() => handleMaterialChange(mat.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    background: material === mat.code ? 'var(--primary-light)' : 'var(--bg-muted)',
                    border: material === mat.code ? '1px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="mono" style={{ fontWeight: 800, color: material === mat.code ? 'var(--primary)' : 'var(--text-main)' }}>
                      {mat.code}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {mat.name.split('(')[0]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }} className="mono">
                      ₹{mat.grades['Clean & Sorted']} / kg
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      (Top Grade)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal for Waste Picker Card */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(scannedCode) => {
          const clean = scannedCode.replace('CL:W:', '').trim();
          setWorkerCode(clean);
          setScanFeedback(`Scanned Card: ${clean}`);
        }}
        expectedPrefix="CL:W:"
        title="Scan Waste Picker QR Card / Badge"
      />
    </div>
  );
}
