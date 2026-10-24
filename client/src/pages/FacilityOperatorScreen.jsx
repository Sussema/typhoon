import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submit } from '../offline/outbox.js';

export function FacilityOperatorScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('batch');

  // Batch states
  const [machineCode, setMachineCode] = useState('MCH-BALER-01');
  const [inputKg, setInputKg] = useState('50.0');
  const [recoveredKg, setRecoveredKg] = useState('48.5');
  const [residualKg, setResidualKg] = useState('1.2');
  const [weightSource, setWeightSource] = useState('scale');
  const [batchSaved, setBatchSaved] = useState(null);

  // Machine event states
  const [eventKind, setEventKind] = useState('maintenance');
  const [eventNote, setEventNote] = useState('');
  const [eventSaved, setEventSaved] = useState(false);

  // Shipment states
  const [shipBatchId, setShipBatchId] = useState('BATCH-2026-10-A');
  const [recyclerUser, setRecyclerUser] = useState('EcoPlast Recyclers Ltd');
  const [shipKg, setShipKg] = useState('48.5');
  const [vehicleNo, setVehicleNo] = useState('MH-12-AB-9876');
  const [shipSaved, setShipSaved] = useState(null);

  // Real-time mass-balance calculation (Section 9.1)
  const inputG = Math.round((parseFloat(inputKg) || 0) * 1000);
  const recoveredG = Math.round((parseFloat(recoveredKg) || 0) * 1000);
  const residualG = Math.round((parseFloat(residualKg) || 0) * 1000);
  const totalOutputG = recoveredG + residualG;
  const gapG = inputG - totalOutputG;
  const allowedG = Math.max(500, Math.round((inputG * 1) / 100)); // max(0.5 kg, 1%)
  const isOutputsExceed = totalOutputG > inputG;
  const isGapFlagged = gapG > allowedG;

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (isOutputsExceed) return alert('Error: Outputs (recovered + residual) cannot exceed input!');

    try {
      const payload = {
        machineId: '00000000-0000-0000-0000-000000000021',
        inputG,
        recoveredG,
        residualG,
        weightSource
      };

      const clientId = await submit('/batches', payload);
      setBatchSaved({
        clientId,
        machineCode,
        inputKg,
        recoveredKg,
        residualKg,
        gapKg: (gapG / 1000).toFixed(2),
        isGapFlagged,
        time: new Date().toLocaleTimeString()
      });
    } catch (err) {
      alert(`Batch save error: ${err.message}`);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      await submit('/machine-events', {
        machineId: '00000000-0000-0000-0000-000000000021',
        kind: eventKind,
        note: eventNote
      });
      setEventSaved(true);
      setEventNote('');
      setTimeout(() => setEventSaved(false), 3000);
    } catch (err) {
      alert(`Event error: ${err.message}`);
    }
  };

  const handleSaveShipment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        batchId: '00000000-0000-0000-0000-000000000031',
        recyclerUserId: '00000000-0000-0000-0000-000000000041',
        material: 'PET',
        shippedG: Math.round((parseFloat(shipKg) || 0) * 1000),
        vehicleNo
      };

      const clientId = await submit('/shipments', payload);
      setShipSaved({
        clientId,
        batch: shipBatchId,
        kg: shipKg,
        vehicle: vehicleNo,
        time: new Date().toLocaleTimeString()
      });
    } catch (err) {
      alert(`Shipment error: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '1.5rem auto', padding: '0 1rem' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          className={`btn ${activeTab === 'batch' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('batch')}
        >
          ⚙️ New Machine Batch (Run)
        </button>
        <button
          className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('events')}
        >
          🛠️ Machine Events & Downtime
        </button>
        <button
          className={`btn ${activeTab === 'dispatch' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('dispatch')}
        >
          🚚 Dispatch to Recycler
        </button>
      </div>

      {activeTab === 'batch' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>🏭 Processing Batch Mass Balance</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>MRF Sorting Line / Baler Machine Integration</p>
            </div>
            <span className="badge badge-info">Step 6: Facility Processing</span>
          </div>

          <form onSubmit={handleSaveBatch}>
            <div style={{ marginBottom: '1rem' }}>
              <label>Machine QR Code</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input-field mono"
                  value={machineCode}
                  onChange={(e) => setMachineCode(e.target.value)}
                />
                <button type="button" className="btn btn-outline" onClick={() => alert('Scanned machine: MCH-BALER-01')}>
                  📷 Scan Machine QR
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label>Input (कच्चा माल)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field mono"
                    value={inputKg}
                    onChange={(e) => setInputKg(e.target.value)}
                    required
                  />
                  <span style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-muted)', fontSize: '0.85rem' }}>kg</span>
                </div>
              </div>

              <div>
                <label>Recovered (पुनर्प्राप्त)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field mono"
                    value={recoveredKg}
                    onChange={(e) => setRecoveredKg(e.target.value)}
                    required
                  />
                  <span style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-muted)', fontSize: '0.85rem' }}>kg</span>
                </div>
              </div>

              <div>
                <label>Residual (कचरा/अवशेष)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field mono"
                    value={residualKg}
                    onChange={(e) => setResidualKg(e.target.value)}
                    required
                  />
                  <span style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-muted)', fontSize: '0.85rem' }}>kg</span>
                </div>
              </div>
            </div>

            {/* Live Mass Balance Monitor (Section 9.1) */}
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              border: isOutputsExceed ? '2px solid var(--accent-red)' : isGapFlagged ? '2px solid var(--accent-amber)' : '2px solid var(--accent)',
              backgroundColor: isOutputsExceed ? '#fee2e2' : isGapFlagged ? '#fef3c7' : 'var(--primary-light)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Mass Balance Check:</span>
                <span className={`badge ${isOutputsExceed ? 'badge-danger' : isGapFlagged ? 'badge-warning' : 'badge-success'}`}>
                  {isOutputsExceed ? 'CRITICAL: Outputs > Input' : isGapFlagged ? 'FLAGGED: Unexplained Gap' : 'BALANCED & VERIFIED'}
                </span>
              </div>

              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Input: <strong>{inputKg || 0} kg</strong> = Recovered: <strong>{recoveredKg || 0} kg</strong> + Residual: <strong>{residualKg || 0} kg</strong> + Gap: <strong>{(gapG / 1000).toFixed(2)} kg</strong>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Allowed tolerance limit: max(0.5 kg, 1% of input) = {(allowedG / 1000).toFixed(2)} kg
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: 50 }}
              disabled={isOutputsExceed}
            >
              💾 Record Verified Processing Batch
            </button>
          </form>

          {batchSaved && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <strong>Batch Saved to Append-Only Ledger:</strong> {batchSaved.clientId} on {batchSaved.machineCode}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Mass balance: {batchSaved.inputKg} kg in ➔ {batchSaved.recoveredKg} kg recovered (Gap: {batchSaved.gapKg} kg)
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>🛠️ Log Machine Event</h2>
          <form onSubmit={handleSaveEvent}>
            <div style={{ marginBottom: '1rem' }}>
              <label>Event Type</label>
              <select className="input-field" value={eventKind} onChange={(e) => setEventKind(e.target.value)}>
                <option value="downtime_start">Downtime Started (ब्रेकडाउन)</option>
                <option value="downtime_end">Downtime Ended (पुन्हा सुरू)</option>
                <option value="maintenance">Routine Maintenance (देखभाल)</option>
                <option value="calibration">Scale / Sensor Calibration (प्रमाणीकरण)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label>Operator Observation Note</label>
              <textarea
                className="input-field"
                style={{ height: 100 }}
                value={eventNote}
                onChange={(e) => setEventNote(e.target.value)}
                placeholder="e.g. Belt replacement completed, test run successful"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Log Event to Audit Chain
            </button>
            {eventSaved && <p style={{ color: 'var(--primary)', marginTop: '0.5rem', fontWeight: 600 }}>Event recorded successfully!</p>}
          </form>
        </div>
      )}

      {activeTab === 'dispatch' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>🚚 Dispatch to Authorized Recycler</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Over-shipment Block Enforced via Database Lock</p>
            </div>
            <span className="badge badge-info">Step 7: Recycler Dispatch</span>
          </div>

          <form onSubmit={handleSaveShipment}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label>Source Batch ID</label>
                <input type="text" className="input-field mono" value={shipBatchId} onChange={(e) => setShipBatchId(e.target.value)} required />
              </div>
              <div>
                <label>Recycler Partner</label>
                <input type="text" className="input-field" value={recyclerUser} onChange={(e) => setRecyclerUser(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label>Dispatch Weight (kg)</label>
                <input type="number" step="0.1" className="input-field mono" value={shipKg} onChange={(e) => setShipKg(e.target.value)} required />
              </div>
              <div>
                <label>Transport Vehicle No.</label>
                <input type="text" className="input-field mono" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 48 }}>
              Generate Dispatch Manifest & Lock Batch
            </button>
          </form>

          {shipSaved && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <strong>Shipment Manifest Created:</strong> {shipSaved.clientId}
              <div>{shipSaved.kg} kg dispatched via {shipSaved.vehicle}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
