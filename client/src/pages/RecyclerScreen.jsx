import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submit } from '../offline/outbox.js';

export function RecyclerScreen() {
  const { t } = useTranslation();
  const [shipments, setShipments] = useState([
    { id: 'SHP-2026-881', facility: 'Pune Municipal MRF Hub A', material: 'Baled PET Flakes', shippedKg: 1200, status: 'In Transit', vehicle: 'MH-12-FC-1092' },
    { id: 'SHP-2026-882', facility: 'North Zone Baler Facility', material: 'HDPE Rigids', shippedKg: 850, status: 'In Transit', vehicle: 'MH-12-QX-4412' }
  ]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [receivedKg, setReceivedKg] = useState('');
  const [note, setNote] = useState('');
  const [receiptSuccess, setReceiptSuccess] = useState(null);

  const handleConfirmReceipt = async (e) => {
    e.preventDefault();
    const rKg = parseFloat(receivedKg) || 0;
    const diffKg = selectedShipment.shippedKg - rKg;

    try {
      await submit(`/shipments/${selectedShipment.id}/receipt`, {
        receivedG: Math.round(rKg * 1000),
        note
      });

      setReceiptSuccess({
        shipmentId: selectedShipment.id,
        shippedKg: selectedShipment.shippedKg,
        receivedKg: rKg,
        diffKg,
        flagged: Math.abs(diffKg) > (selectedShipment.shippedKg * 0.01)
      });

      // Update local status
      setShipments(shipments.map(s => s.id === selectedShipment.id ? { ...s, status: 'Confirmed' } : s));
      setSelectedShipment(null);
    } catch (err) {
      alert(`Receipt confirmation error: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '1.5rem auto', padding: '0 1rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>♻️ {t('recycler')} (Verified Partner Portal)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Incoming Facility Shipments & Weight Attestation</p>
          </div>
          <span className="badge badge-info">Step 7: Inbound Receipt</span>
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Pending Incoming Consignments</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {shipments.map((s) => (
            <div
              key={s.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: s.status === 'Confirmed' ? 'var(--bg-muted)' : 'white'
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }} className="mono">{s.id} · {s.material}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Origin: {s.facility} · Vehicle: {s.vehicle}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                  Shipped Quantity: {s.shippedKg} kg
                </div>
              </div>

              <div>
                {s.status === 'Confirmed' ? (
                  <span className="badge badge-success">✓ Received & Recorded</span>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ minHeight: 40 }}
                    onClick={() => {
                      setSelectedShipment(s);
                      setReceivedKg(s.shippedKg.toString());
                    }}
                  >
                    Weigh & Accept
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal / Drawer */}
      {selectedShipment && (
        <div className="card" style={{ border: '2px solid var(--primary)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Attest Incoming Delivery: {selectedShipment.id}
          </h3>

          <form onSubmit={handleConfirmReceipt}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label>Dispatched Weight (From Facility)</label>
                <input type="text" className="input-field mono" value={`${selectedShipment.shippedKg} kg`} disabled />
              </div>
              <div>
                <label>Actual Weighed Net Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field mono"
                  value={receivedKg}
                  onChange={(e) => setReceivedKg(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label>Recycler Inspection Notes</label>
              <input
                type="text"
                className="input-field"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Moisture content normal, bale ties intact"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Confirm & Seal Receipt in Hash Chain
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setSelectedShipment(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Evidence Pack Banner */}
      {receiptSuccess && (
        <div className="card" style={{ marginTop: '1.5rem', background: 'var(--primary-light)', border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h4 style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>
                Recycling Evidence Pack Generated ({receiptSuccess.shipmentId})
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Dispatched: {receiptSuccess.shippedKg} kg | Verified: {receiptSuccess.receivedKg} kg | Variance: {receiptSuccess.diffKg} kg
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`badge ${receiptSuccess.flagged ? 'badge-warning' : 'badge-success'}`}>
                {receiptSuccess.flagged ? 'Transit Variance Flagged' : 'Audit Validated'}
              </span>
              <a
                href={`/api/reports/evidence/${receiptSuccess.shipmentId}?format=html`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                📄 View Evidence Pack
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
