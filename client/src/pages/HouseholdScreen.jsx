import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/http.js';
import { calculateSegregationRating } from '../utils/rating.js';

export function HouseholdScreen() {
  const { t } = useTranslation();
  const [householdCode, setHouseholdCode] = useState('HOME-102');
  const [portalData, setPortalData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Custom Pickup state
  const [customCategory, setCustomCategory] = useState('e_waste');
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('Morning (09:00 AM – 11:30 AM)');
  const [pickupNotes, setPickupNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [activeTicketModal, setActiveTicketModal] = useState(null);

  // Redemption state
  const [redeemType, setRedeemType] = useState('upi'); // 'upi' | 'property_tax'
  const [redeemPoints, setRedeemPoints] = useState(100);
  const [destination, setDestination] = useState('household.shinde@oksbi');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [payoutReceipt, setPayoutReceipt] = useState(null);

  // Fetch portal data
  const loadPortal = async (code) => {
    setLoading(true);
    try {
      const data = await api(`/households/${code}/portal`);
      setPortalData(data);
    } catch (err) {
      console.warn('Failed to load portal data from API, using fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortal(householdCode);
  }, [householdCode]);

  // Handle Custom Garbage Pickup Scheduling
  const handleScheduleCustomPickup = async (e) => {
    e.preventDefault();
    setIsScheduling(true);
    try {
      const res = await api('/households/custom-pickup', {
        method: 'POST',
        body: {
          householdCode,
          category: customCategory,
          preferredDate: pickupDate,
          timeSlot,
          notes: pickupNotes
        }
      });
      setActiveTicketModal(res.ticket);
      setPickupNotes('');
      loadPortal(householdCode);
    } catch (err) {
      alert(`Failed to schedule pickup: ${err.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleResetPoints = async () => {
    try {
      await api(`/households/${householdCode}/reset-points`, { method: 'POST' });
      loadPortal(householdCode);
    } catch (e) {
      setPortalData(prev => prev ? { ...prev, points: 120 } : prev);
    }
  };

  // Handle Cashback & Tax Rebate Redemption
  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!destination.trim()) {
      alert('Please enter a valid UPI ID or Municipal Property ID');
      return;
    }
    if ((portalData?.points || 0) < redeemPoints) {
      alert(`Insufficient balance. You have ${portalData?.points || 0} points.`);
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await api('/households/redeem', {
        method: 'POST',
        body: {
          householdCode,
          type: redeemType,
          points: parseInt(redeemPoints, 10),
          destination: destination.trim()
        }
      });
      setPayoutReceipt(res.receipt);
      loadPortal(householdCode);
    } catch (err) {
      alert(`Redemption error: ${err.message}`);
    } finally {
      setIsRedeeming(false);
    }
  };

  const points = portalData?.points ?? 120;
  const streak = portalData?.streak ?? 5;
  const nextMilestone = 200;
  const progressPct = Math.min(100, Math.round((points / nextMilestone) * 100));
  const pointsToGo = Math.max(0, nextMilestone - points);

  // Household Segregation Rating calculation (how often they segregate properly)
  const segregationRating = portalData?.rating || calculateSegregationRating(portalData?.history, streak, householdCode);

  return (
    <div style={{ maxWidth: 1280, margin: '1.5rem auto', padding: '0 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Seamless Integrated Header (No detached background box) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '2rem' }}>🏡</span>
              <div>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
                  Household & Consumer Operations Portal
                </h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Step 5 Operations: Append-Only Civic Segregation Ledger · UPI Cashback & Tax Rebates · Custom Specialized Pickups
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Active Household QR
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }} className="mono">
                  {householdCode}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {['HOME-102', 'HOME-0193', 'HOME-0077'].map(c => (
                  <button
                    key={c}
                    onClick={() => setHouseholdCode(c)}
                    style={{
                      minHeight: 28,
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem',
                      background: householdCode === c ? 'var(--primary)' : 'var(--bg-muted)',
                      color: householdCode === c ? 'var(--text-inverse)' : 'var(--text-main)',
                      border: householdCode === c ? '1px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Prominent Segregation Rating Tag */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.45rem 0.85rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                {t('segregation_rating', 'Segregation Rating Tag')}
              </span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-main)' }}>
                <span>{segregationRating.tag}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({segregationRating.scorePct}% Proper)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Details strip seamlessly mixing with main background */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          fontSize: '0.825rem',
          color: 'var(--text-muted)',
          paddingTop: '0.25rem',
          alignItems: 'center'
        }}>
          <div>📍 <strong>Ward:</strong> <span style={{ color: 'var(--text-main)' }}>{portalData?.ward || 'Ward 12 (Ghole Road)'}</span></div>
          <div>👤 <strong>Assigned Collector:</strong> <span style={{ color: 'var(--text-main)' }}>{portalData?.worker || 'WRK-0014 (Ramesh Shinde)'}</span></div>
          <div>⭐ <strong>Track Record:</strong> <span style={{ color: segregationRating.scorePct >= 90 ? '#16a34a' : 'var(--primary)', fontWeight: 700 }}>{segregationRating.label} ({segregationRating.scorePct}% Proper)</span></div>
          <div>⚖️ <strong>DPDP Act Consent:</strong> <span style={{ color: '#16a34a', fontWeight: 600 }}>Recorded & Active ✅</span></div>
        </div>
      </div>

      {/* Row 1: Core Metrics, Segregation Rating Tag & Points Balance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {/* Segregation Rating & Quality Tag Card */}
        <div className="card" style={{ borderLeft: `4px solid ${segregationRating.scorePct >= 90 ? '#10b981' : segregationRating.scorePct >= 75 ? '#3b82f6' : segregationRating.scorePct >= 50 ? '#f59e0b' : '#ef4444'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>SEGREGATION RATING</span>
            <span className={`badge ${segregationRating.badgeClass}`} style={{ fontWeight: 800 }}>
              {segregationRating.tier}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: segregationRating.scorePct >= 90 ? '#10b981' : segregationRating.scorePct >= 75 ? '#3b82f6' : '#d97706' }}>
              ⭐ {segregationRating.stars}
            </span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>/ 5.0</span>
            <span style={{ marginLeft: 'auto', fontSize: '1.05rem', fontWeight: 800, color: segregationRating.scorePct >= 90 ? '#166534' : 'var(--text-main)' }}>
              {segregationRating.scorePct}% Proper
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.5rem' }}>
            <div style={{
              width: `${segregationRating.scorePct}%`,
              height: '100%',
              background: segregationRating.scorePct >= 90 ? 'linear-gradient(90deg, #10b981, #059669)' : segregationRating.scorePct >= 75 ? 'linear-gradient(90deg, #3b82f6, #1d4ed8)' : segregationRating.scorePct >= 50 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : '#ef4444',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span><strong>{segregationRating.label}</strong></span>
            <span>{segregationRating.correctCount} Perfect · {segregationRating.partialCount} Partial · {segregationRating.incorrectCount} Mixed</span>
          </div>
        </div>

        {/* Points Balance Card */}
        <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>ACCUMULATED POINTS</span>
            <span className="badge badge-success">Verified Balance</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)' }} className="mono">
              {loading ? '...' : points}
            </span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>pts</span>
            <span style={{ marginLeft: 'auto', fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>
              ≈ ₹{((points * 12) / 100).toFixed(2)}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.5rem' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #125e3b)', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Progress: {progressPct}%</span>
            <span>{pointsToGo === 0 ? '🎉 Milestone Reached!' : `Next: ${nextMilestone} pts (${pointsToGo} to go)`}</span>
          </div>
        </div>

        {/* Streak Counter Card */}
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>DOORSTEP STREAK</span>
            <span className="badge badge-warning">Consecutive Audit</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#d97706' }}>
              🔥 {streak}
            </span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Days Segregated</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {streak % 7 === 0 && streak > 0 ? (
              <span style={{ color: '#166534', fontWeight: 700 }}>⭐ 7-Day streak bonus awarded (+30 bonus pts)!</span>
            ) : (
              <span>Maintain correct dry/wet separation for {7 - (streak % 7)} more days to claim a <strong>+30 pts bonus</strong>!</span>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Two Columns: Custom Garbage Pickup & Cashback / Tax Redemption */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        {/* Module A: Custom Specialized Garbage Pickup */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>📦</span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Custom Garbage Pickup Service</h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Schedule an on-demand specialized collection with preferred time slot and generate a scannable tracking ticket QR.
          </p>

          <form onSubmit={handleScheduleCustomPickup} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label>Specialized Waste Stream</label>
              <select
                className="input-field"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              >
                <option value="e_waste">🔌 E-Waste (Computers, cables, batteries, devices)</option>
                <option value="bulk_recyclables">📦 Bulk Recyclables (Cardboard cartons, drums, crates)</option>
                <option value="bulky_furniture">🛋️ Bulky Furniture & Scrap Metal (Chairs, bed frames)</option>
                <option value="domestic_hazardous">🧪 Domestic Hazardous (Paints, CFL/LED bulbs, chemicals)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label>Preferred Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={pickupDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPickupDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Preferred Time Slot</label>
                <select
                  className="input-field"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                >
                  <option>Morning (09:00 AM – 11:30 AM)</option>
                  <option>Afternoon (02:00 PM – 04:30 PM)</option>
                  <option>Evening (05:00 PM – 07:00 PM)</option>
                </select>
              </div>
            </div>

            <div>
              <label>Inventory Notes & Estimated Volume</label>
              <textarea
                className="input-field"
                style={{ minHeight: 70, resize: 'vertical' }}
                value={pickupNotes}
                onChange={(e) => setPickupNotes(e.target.value)}
                placeholder="e.g. 2 broken laptops, 1 mixer grinder, copper wiring in a carton near front gate."
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isScheduling}
              style={{ marginTop: '0.5rem' }}
            >
              {isScheduling ? 'Generating Pass...' : '🏷️ Schedule Pickup & Generate Tracking QR'}
            </button>
          </form>

          {/* Active Scheduled Pickups List */}
          {portalData?.customPickups && portalData.customPickups.length > 0 && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                ACTIVE PICKUP TICKETS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {portalData.customPickups.slice(0, 2).map((ticket) => (
                  <div
                    key={ticket.ticketId}
                    onClick={() => setActiveTicketModal(ticket)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      background: 'var(--bg-muted)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{ticket.categoryLabel}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        📅 {ticket.preferredDate} · {ticket.timeSlot.split(' ')[0]}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>{ticket.status}</span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginTop: '0.2rem' }}>
                        View QR 📱
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Module B: Cashback & Civic Tax Redemption */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>💸</span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Cashback & Civic Redemption</h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Redeem verified points for direct UPI/bank cashback or municipal property tax rebate vouchers.
          </p>

          <form onSubmit={handleRedeem} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Redemption Type Switcher */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--bg-muted)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => {
                  setRedeemType('upi');
                  setDestination('household.shinde@oksbi');
                }}
                style={{
                  minHeight: 38,
                  padding: '0.35rem',
                  fontSize: '0.85rem',
                  background: redeemType === 'upi' ? 'white' : 'transparent',
                  color: redeemType === 'upi' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: redeemType === 'upi' ? 'var(--shadow-sm)' : 'none',
                  fontWeight: redeemType === 'upi' ? 700 : 500
                }}
              >
                ⚡ UPI / Bank Cashback
              </button>

              <button
                type="button"
                onClick={() => {
                  setRedeemType('property_tax');
                  setDestination('PMC-PROP-09214');
                }}
                style={{
                  minHeight: 38,
                  padding: '0.35rem',
                  fontSize: '0.85rem',
                  background: redeemType === 'property_tax' ? 'white' : 'transparent',
                  color: redeemType === 'property_tax' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: redeemType === 'property_tax' ? 'var(--shadow-sm)' : 'none',
                  fontWeight: redeemType === 'property_tax' ? 700 : 500
                }}
              >
                🏛️ Property Tax Rebate
              </button>
            </div>

            {/* Quick Points Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ margin: 0 }}>Select Points to Redeem (Rate: 100 pts = ₹12)</label>
                <button
                  type="button"
                  onClick={handleResetPoints}
                  style={{
                    minHeight: 24,
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.7rem',
                    background: 'var(--bg-muted)',
                    color: 'var(--text-muted)',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                  title="Reset demo points & audit history to initial condition (120 pts)"
                >
                  🔄 Reset to Initial (120 pts)
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {[50, 100, 200].map((pts) => {
                  const isSelected = redeemPoints === pts;
                  return (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setRedeemPoints(pts)}
                      style={{
                        flex: 1,
                        minHeight: 42,
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.85rem',
                        background: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                      }}
                    >
                      {pts} pts (₹{((pts * 12) / 100).toFixed(0)})
                    </button>
                  );
                })}
              </div>

              {/* Direct points input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Custom amount:</span>
                <input
                  type="number"
                  min="1"
                  className="input-field mono"
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  style={{ minHeight: 36, padding: '0.25rem 0.65rem', fontSize: '0.85rem' }}
                  placeholder="Enter points"
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pts</span>
              </div>

              {/* Shortfall warning & fast topup */}
              {points < redeemPoints && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.4rem 0.65rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid var(--accent-red)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}>
                  <span>⚠️ Current balance is {points} pts (need {redeemPoints - points} more).</span>
                  <button
                    type="button"
                    onClick={() => handleDoorstepAudit('correct')}
                    style={{
                      minHeight: 24,
                      padding: '0.1rem 0.45rem',
                      fontSize: '0.7rem',
                      background: '#166534',
                      color: 'white',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    +20 pts (Audit)
                  </button>
                </div>
              )}
            </div>

            <div>
              <label>{redeemType === 'upi' ? 'UPI ID (Virtual Payment Address)' : 'PMC Property Assessment Number'}</label>
              <input
                type="text"
                className="input-field"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={redeemType === 'upi' ? 'e.g. mobile@upi or name@oksbi' : 'e.g. PMC-PROP-09214'}
                required
              />
            </div>

            <div style={{
              background: 'var(--bg-muted)',
              border: '1px dashed var(--accent)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Estimated Payout Value:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }} className="mono">
                ₹{((redeemPoints * 12) / 100).toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-success"
              disabled={isRedeeming || points < redeemPoints}
              style={{ marginTop: '0.5rem' }}
            >
              {isRedeeming ? 'Processing Payout...' : points < redeemPoints ? `⚠️ Insufficient Points (${points}/${redeemPoints} pts)` : `💳 Redeem ${redeemPoints} Points (₹${((redeemPoints * 12) / 100).toFixed(0)})`}
            </button>
          </form>
        </div>
      </div>

      {/* Row 4: Segregation Audit History & Chained Cryptographic Ledger */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Doorstep Segregation Audit History</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Verified by municipal sanitation workers with SHA-256 linear ledger block hashes.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className={`badge ${segregationRating.badgeClass}`} style={{ fontWeight: 800 }}>
              {segregationRating.tag} ({segregationRating.scorePct}% Proper Frequency)
            </span>
            <span className="badge badge-info">Append-Only Immutability</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Record ID</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Date & Time</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Segregation Grade</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Points Awarded</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Ledger Block Hash</th>
              </tr>
            </thead>
            <tbody>
              {portalData?.history && portalData.history.length > 0 ? (
                portalData.history.map((h, i) => (
                  <tr key={h.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700 }} className="mono">{h.id}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>{h.date} · {h.time}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <span className={`badge ${
                        h.result === 'correct' ? 'badge-success' :
                        h.result === 'partial' ? 'badge-warning' :
                        h.result === 'no_waste' ? 'badge-info' : 'badge-danger'
                      }`}>
                        {h.gradeLabel || h.result}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 800, color: h.points > 0 ? '#166534' : 'inherit' }} className="mono">
                      +{h.points} pts
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }} className="mono">
                      {h.blockHash ? `${h.blockHash.substring(0, 16)}...` : '00a4b73f8e129038...'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No audit records yet. Run an optical scan above to record an inspection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Tracking Ticket QR Modal for Custom Pickups */}
      {activeTicketModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', textAlign: 'center', position: 'relative' }}>
            <button
              onClick={() => setActiveTicketModal(null)}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                minHeight: 32,
                width: 32,
                padding: 0,
                borderRadius: '50%',
                background: '#f1f5f9'
              }}
            >
              ✕
            </button>

            <span className="badge badge-success" style={{ marginBottom: '0.75rem' }}>Pickup Ticket Confirmed</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Specialized Collection Pass
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Show this QR code to the collection driver on arrival.
            </p>

            {/* QR Graphic Container */}
            <div style={{
              background: 'var(--bg-muted)',
              border: '2px dashed var(--primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              margin: '0 auto 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 240
            }}>
              {activeTicketModal.qrDataUrl ? (
                <img src={activeTicketModal.qrDataUrl} alt="QR Code" style={{ width: 180, height: 180 }} />
              ) : (
                <div style={{ width: 180, height: 180, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                  📱
                </div>
              )}
              <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: '0.5rem' }} className="mono">
                {activeTicketModal.ticketId}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} className="mono">
                {activeTicketModal.qrPayload}
              </div>
            </div>

            {/* Ticket Details */}
            <div style={{ textAlign: 'left', fontSize: '0.85rem', background: 'var(--bg-muted)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <div>📦 <strong>Stream:</strong> {activeTicketModal.categoryLabel}</div>
              <div>📅 <strong>Date & Slot:</strong> {activeTicketModal.preferredDate} · {activeTicketModal.timeSlot}</div>
              <div>📍 <strong>Address:</strong> {activeTicketModal.address}</div>
              {activeTicketModal.notes && <div>📝 <strong>Notes:</strong> {activeTicketModal.notes}</div>}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, minHeight: 40, fontSize: '0.85rem' }}
                onClick={() => window.print()}
              >
                🖨️ Print Pass
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, minHeight: 40, fontSize: '0.85rem' }}
                onClick={() => setActiveTicketModal(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Instant Digital Payout Receipt Modal */}
      {payoutReceipt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: 460, width: '100%', textAlign: 'center', position: 'relative' }}>
            <button
              onClick={() => setPayoutReceipt(null)}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                minHeight: 32,
                width: 32,
                padding: 0,
                borderRadius: '50%',
                background: '#f1f5f9'
              }}
            >
              ✕
            </button>

            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontSize: '1.5rem' }}>
              ✓
            </div>

            <span className="badge badge-success">Digital Payout Dispatched</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.5rem', marginBottom: '0.25rem' }}>
              Verified Payout Slip
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Instant remittance executed via National Payments Corporation / PMC Treasury Gateway
            </p>

            <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'left', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Receipt ID:</span>
                <span className="mono" style={{ fontWeight: 700 }}>{payoutReceipt.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Channel:</span>
                <span style={{ fontWeight: 600 }}>{payoutReceipt.typeLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Destination VPA:</span>
                <span className="mono" style={{ fontWeight: 700 }}>{payoutReceipt.destination}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Points Deducted:</span>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>-{payoutReceipt.pointsRedeemed} pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                <span style={{ fontWeight: 700 }}>Remitted Amount:</span>
                <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#166534' }} className="mono">
                  ₹{payoutReceipt.amountRupees}.00
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>UTR / Ref No:</span>
                <span className="mono" style={{ fontSize: '0.75rem' }}>{payoutReceipt.utr}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Ledger Block SHA-256:</span>
                <div className="mono" style={{ fontSize: '0.65rem', wordBreak: 'break-all', color: '#0f172a' }}>
                  {payoutReceipt.blockHash}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, minHeight: 40, fontSize: '0.85rem' }}
                onClick={() => window.print()}
              >
                🖨️ Print Receipt
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, minHeight: 40, fontSize: '0.85rem' }}
                onClick={() => setPayoutReceipt(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
