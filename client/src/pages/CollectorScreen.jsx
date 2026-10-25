import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { submit } from '../offline/outbox.js';
import { QRScannerModal } from '../components/QRScannerModal.jsx';
import { parseSmsPickup } from '../utils/smsParser.js';
import { calculateSegregationRating } from '../utils/rating.js';

export function CollectorScreen() {
  const { t, i18n } = useTranslation();
  const [householdCode, setHouseholdCode] = useState('HOME-0193');
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Active channel mode: 'sms' (Collector SMS Reporting) or 'touch' (Manual QR & 4-Button Touch)
  const [activeChannel, setActiveChannel] = useState('sms');

  // Collector Worker Details & SMS State
  const collectorPhone = '+91 98201 44014'; // Worker WRK-0014 mobile
  const [smsInput, setSmsInput] = useState('house no 193 yes');
  const [smsFeed, setSmsFeed] = useState([
    {
      id: 'SMS-1001',
      phone: '+91 98201 44014',
      householdCode: 'HOME-0190',
      rawMessage: 'house no 190 yes',
      intent: 'yes',
      status: 'perfectly_segregated',
      result: 'correct',
      points: 20,
      badgeClass: 'badge-success',
      time: '08:42 AM'
    },
    {
      id: 'SMS-1002',
      phone: '+91 98201 44014',
      householdCode: 'HOME-0191',
      rawMessage: 'house no 191 ok',
      intent: 'ok',
      status: 'partially_segregated',
      result: 'partial',
      points: 10,
      badgeClass: 'badge-warning',
      time: '08:45 AM'
    },
    {
      id: 'SMS-1003',
      phone: '+91 98201 44014',
      householdCode: 'HOME-0192',
      rawMessage: 'house no 192 no',
      intent: 'no',
      status: 'not_segregated',
      result: 'incorrect',
      points: 0,
      badgeClass: 'badge-danger',
      time: '08:48 AM'
    },
    {
      id: 'SMS-1004',
      phone: '+91 98201 44014',
      householdCode: 'HOME-0193',
      rawMessage: '[No SMS Sent]',
      intent: 'not_received',
      status: 'not_collected_skipped',
      result: 'no_waste',
      points: 0,
      badgeClass: 'badge-neutral',
      time: '08:50 AM'
    }
  ]);

  // Dynamic live parsing of the current SMS input sent by collector
  const parsedPreview = parseSmsPickup(smsInput, householdCode, collectorPhone);

  // Helper to translate status dynamically
  const getStatusLabel = (statusKey) => {
    switch (statusKey) {
      case 'perfectly_segregated':
        return `✅ ${t('perfectly_segregated', 'Perfect Segregation')}`;
      case 'partially_segregated':
        return `⚠️ ${t('partially_segregated', 'Partially Segregated')}`;
      case 'not_segregated':
        return `❌ ${t('not_segregated', 'Not Segregated (Mixed)')}`;
      case 'not_collected_skipped':
        return `🚪 ${t('not_collected_skipped', 'Not Collected or Skipped')}`;
      default:
        return parsedPreview.statusLabel;
    }
  };

  // Standard touch button handler
  const handlePickup = async (result, points) => {
    setIsSaving(true);
    try {
      const gradeMap = {
        correct: 'dry_clean',
        partial: 'dry_dirty',
        incorrect: 'wet_mixed',
        no_waste: 'dry_clean'
      };
      const payload = {
        householdCode: householdCode || 'HOME-0193',
        householdId: '00000000-0000-0000-0000-000000000101',
        workerId: '00000000-0000-0000-0000-000000000002',
        segregationGrade: gradeMap[result] || 'dry_clean',
        result
      };

      await submit('/pickups', payload);
      setLastSaved({
        code: householdCode,
        result,
        points,
        source: t('manual_qr_channel', 'Manual QR & Touch'),
        time: new Date().toLocaleTimeString()
      });

      // Auto-advance to next household stop
      const num = parseInt(householdCode.replace('HOME-', ''), 10) || 1;
      const nextCode = `HOME-${String(num + 1).padStart(4, '0')}`;
      setHouseholdCode(nextCode);
      setSmsInput(
        i18n.language === 'mr'
          ? `घर क्र ${num + 1} हो`
          : i18n.language === 'hi'
          ? `मकान नं ${num + 1} हाँ`
          : `house no ${num + 1} yes`
      );
    } catch (err) {
      alert(`Error saving pickup: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Process pickup from SMS sent by collector
  const handleSmsPickup = async (parsedData) => {
    setIsSaving(true);
    try {
      const targetHouse = parsedData.householdCode || householdCode;
      const payload = {
        householdCode: targetHouse,
        householdId: '00000000-0000-0000-0000-000000000101',
        workerId: '00000000-0000-0000-0000-000000000002',
        segregationGrade: parsedData.segregationGrade,
        result: parsedData.result,
        source: 'Collector_SMS_Reporting',
        rawMessage: parsedData.rawMessage,
        phone: collectorPhone
      };

      await submit('/pickups', payload);

      // Background webhook sync with server
      try {
        fetch('/api/pickups/sms-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: collectorPhone,
            message: parsedData.rawMessage,
            fallbackHousehold: targetHouse
          })
        }).catch(() => {});
      } catch (e) {}

      // Add to local feed
      const newFeedItem = {
        id: `SMS-${Date.now().toString().slice(-4)}`,
        phone: collectorPhone,
        householdCode: targetHouse,
        rawMessage: parsedData.rawMessage,
        intent: parsedData.intent,
        status: parsedData.status,
        result: parsedData.result,
        points: parsedData.points,
        badgeClass: parsedData.badgeClass,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setSmsFeed((prev) => [newFeedItem, ...prev]);

      setLastSaved({
        code: targetHouse,
        result: parsedData.result,
        points: parsedData.points,
        source: `${t('collector', 'Collector')} SMS ("${parsedData.rawMessage}")`,
        time: new Date().toLocaleTimeString()
      });

      // Auto-advance to next household
      const num = parseInt(targetHouse.replace('HOME-', ''), 10) || 1;
      const nextCode = `HOME-${String(num + 1).padStart(4, '0')}`;
      setHouseholdCode(nextCode);
      setSmsInput(
        i18n.language === 'mr'
          ? `घर क्र ${num + 1} हो`
          : i18n.language === 'hi'
          ? `मकान नं ${num + 1} हाँ`
          : `house no ${num + 1} yes`
      );
    } catch (err) {
      alert(`Error processing collector SMS: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick preset dispatch helper
  const handleQuickPreset = (presetText) => {
    setSmsInput(presetText);
    const parsed = parseSmsPickup(presetText, householdCode, collectorPhone);
    handleSmsPickup(parsed);
  };

  const houseNum = householdCode.replace('HOME-', '');
  const currentHouseRating = calculateSegregationRating([], 3, householdCode);

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
            <span>🚶</span>
            <span>{t('collector', 'Collector')} · {t('collector_sms_channel', 'Collector SMS Reporting')}</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Ward 12 (Ghole Road) · Route Morning A · WRK-0014 (Ramesh Shinde)
          </p>
        </div>
        <span className="badge badge-info" style={{ fontWeight: 700 }}>{t('step_4_doorstep', 'Step 4: Doorstep Audit & Intake')}</span>
      </div>

      {/* Main Info Boxes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Box 1: Doorstep Collection Controls Card */}
        <div className="card">

        {/* Channel Selection Toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-muted)',
          padding: '0.3rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          gap: '0.35rem'
        }}>
          <button
            type="button"
            onClick={() => setActiveChannel('sms')}
            style={{
              flex: 1,
              padding: '0.6rem 1rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: activeChannel === 'sms' ? 'var(--primary)' : 'transparent',
              color: activeChannel === 'sms' ? 'white' : 'var(--text-muted)',
              boxShadow: activeChannel === 'sms' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>📱</span>
            <span>{t('collector_sms_channel', 'Collector SMS Reporting')}</span>
            <span style={{
              background: activeChannel === 'sms' ? 'rgba(255,255,255,0.25)' : 'var(--accent)',
              color: 'white',
              fontSize: '0.7rem',
              padding: '0.1rem 0.4rem',
              borderRadius: 'var(--radius-sm)'
            }}>SMS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel('touch')}
            style={{
              flex: 1,
              padding: '0.6rem 1rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: activeChannel === 'touch' ? 'var(--primary)' : 'transparent',
              color: activeChannel === 'touch' ? 'white' : 'var(--text-muted)',
              boxShadow: activeChannel === 'touch' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>📷</span>
            <span>{t('manual_qr_channel', 'Manual QR & 4-Button Touch')}</span>
          </button>
        </div>

        {/* Current Household & Collector Phone Bar */}
        <div style={{
          background: 'var(--bg-muted)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
              {t('current_route_stop', 'Current Route Stop')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input-field mono"
                style={{ width: 140, fontWeight: 800, fontSize: '1rem', padding: '0.3rem 0.6rem' }}
                value={householdCode}
                onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
                placeholder="HOME-0193"
              />
              <span className={`badge ${currentHouseRating.badgeClass}`} style={{ fontSize: '0.8rem', fontWeight: 700 }} title="Household Segregation Quality Rating">
                {currentHouseRating.tag} ({currentHouseRating.scorePct}% Proper)
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                📱 {t('collector_mobile_no', 'Collector Mobile No.')}: <strong>{collectorPhone}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              className="btn btn-outline"
              type="button"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              onClick={() => setIsScannerOpen(true)}
              title="Scan Household QR Sticker with Camera"
            >
              📷 {t('scan_qr', 'Scan QR Code')}
            </button>
            <button
              type="button"
              className="btn btn-neutral"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
              onClick={() => {
                const num = parseInt(householdCode.replace('HOME-', ''), 10) || 1;
                const nextCode = `HOME-${String(num + 1).padStart(4, '0')}`;
                setHouseholdCode(nextCode);
                setSmsInput(
                  i18n.language === 'mr'
                    ? `घर क्र ${num + 1} हो`
                    : i18n.language === 'hi'
                    ? `मकान नं ${num + 1} हाँ`
                    : `house no ${num + 1} yes`
                );
              }}
              title="Skip / advance to next house"
            >
              {t('next_house', 'Next House ⏭️')}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CHANNEL 1: COLLECTOR SMS DISPATCH / REPORTING (REQUESTED FEATURE) */}
        {/* ========================================================================= */}
        {activeChannel === 'sms' && (
          <div style={{
            background: 'var(--primary-light)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>📱</span>
                <span>{t('collector_sms_channel', 'Collector SMS Reporting')}</span>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>Multi-Language SMS Active</span>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {t('collector_sms_subtext', "Collector sends SMS for each house: 'yes' = perfect segregation (+20 pts), 'ok' = partial (+10 pts), 'no' = mixed (0 pts), unreceived = skipped (streak kept).")}
            </p>

            {/* Live Message Input Box */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>
                {t('collector_sms_input_label', 'SMS Sent by Collector (e.g. house no 193 yes)')}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input-field"
                  style={{ fontSize: '1rem', fontWeight: 600 }}
                  value={smsInput}
                  onChange={(e) => setSmsInput(e.target.value)}
                  placeholder="e.g. house no 193 yes, मकान नं 193 हाँ, घर क्र 193 हो"
                />
                <button
                  type="button"
                  className="btn btn-neutral"
                  style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                  onClick={() => setSmsInput('')}
                  title="Clear text to simulate no SMS sent"
                >
                  {t('clear_no_sms', 'Clear (No SMS Sent)')}
                </button>
              </div>
            </div>

            {/* Live Intelligence Parsing Result Card */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('detected_house', 'Target House')}:</span>
                  <span className="badge badge-info" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                    {parsedPreview.householdCode}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('points', 'Points')}:</span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: parsedPreview.points > 0 ? '#15803d' : '#475569' }}>
                    +{parsedPreview.points} {t('points', 'pts')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <span className={`badge ${parsedPreview.badgeClass}`} style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}>
                  {getStatusLabel(parsedPreview.status)}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ({parsedPreview.explanation})
                </span>
              </div>
            </div>

            {/* Quick Multi-Language Test Chips */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('quick_presets', 'Quick 1-Click Test Presets:')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {/* English Presets */}
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderColor: '#22c55e', color: '#15803d', background: '#f0fdf4' }}
                  onClick={() => handleQuickPreset(`house no ${houseNum} yes`)}
                >
                  ✅ "house no {houseNum} yes" (+20)
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderColor: '#f59e0b', color: '#b45309', background: '#fffbeb' }}
                  onClick={() => handleQuickPreset(`house no ${houseNum} ok`)}
                >
                  ⚠️ "house no {houseNum} ok" (+10)
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderColor: '#ef4444', color: '#b91c1c', background: '#fef2f2' }}
                  onClick={() => handleQuickPreset(`house no ${houseNum} no`)}
                >
                  ❌ "house no {houseNum} no" (0)
                </button>

                {/* Marathi Presets */}
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderColor: '#10b981', color: '#047857', background: '#ecfdf5' }}
                  onClick={() => handleQuickPreset(`घर क्र ${houseNum} हो`)}
                  title="मराठी एसएमएस: घर क्र ... हो"
                >
                  मराठी: "घर क्र {houseNum} हो"
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderColor: '#d97706', color: '#92400e', background: '#fffbeb' }}
                  onClick={() => handleQuickPreset(`घर क्र ${houseNum} ठीक`)}
                  title="मराठी एसएमएस: घर क्र ... ठीक"
                >
                  मराठी: "घर क्र {houseNum} ठीक"
                </button>

                {/* Hindi Presets */}
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderColor: '#0ea5e9', color: '#0369a1', background: '#f0f9ff' }}
                  onClick={() => handleQuickPreset(`मकान नं ${houseNum} हाँ`)}
                  title="हिंदी एसएमएस: मकान नं ... हाँ"
                >
                  हिंदी: "मकान नं {houseNum} हाँ"
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderColor: '#dc2626', color: '#991b1b', background: '#fef2f2' }}
                  onClick={() => handleQuickPreset(`मकान नं ${houseNum} नहीं`)}
                  title="हिंदी एसएमएस: मकान नं ... नहीं"
                >
                  हिंदी: "मकान नं {houseNum} नहीं"
                </button>

                {/* Skipped */}
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderColor: '#64748b', color: '#475569', background: '#f8fafc' }}
                  onClick={() => handleQuickPreset('')}
                >
                  🚪 {t('no_sms_skipped', 'No SMS Sent (Skip)')}
                </button>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-success"
                style={{ height: 48, fontSize: '1rem', fontWeight: 800, gap: '0.5rem' }}
                disabled={isSaving}
                onClick={() => handleSmsPickup(parsedPreview)}
              >
                <span>📥</span>
                <span>{t('record_collector_sms', 'Record Collector SMS')}</span>
              </button>

              <button
                type="button"
                className="btn btn-neutral"
                style={{ height: 48, fontSize: '0.875rem', fontWeight: 700 }}
                disabled={isSaving}
                onClick={() => handleQuickPreset('')}
                title="Collector did not send SMS for this stop; mark skipped with streak protected"
              >
                ⏱️ {t('no_sms_skipped', 'No SMS Sent (Skip)')}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CHANNEL 2: STANDARD 4 TOUCH BUTTONS (PHYSICAL DOORSTEP INSPECTION) */}
        {/* ========================================================================= */}
        {activeChannel === 'touch' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ marginBottom: '0.75rem', display: 'block', fontWeight: 700 }}>
              {t('manual_qr_channel', 'Manual QR & 4-Button Touch')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-success"
                style={{ flexDirection: 'column', height: 85, fontSize: '1.05rem' }}
                disabled={isSaving}
                onClick={() => handlePickup('correct', 20)}
              >
                <span>✅ {t('perfectly_segregated', 'Complete Segregation')}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>+20 {t('points', 'Points')}</span>
              </button>

              <button
                type="button"
                className="btn btn-warning"
                style={{ flexDirection: 'column', height: 85, fontSize: '1.05rem' }}
                disabled={isSaving}
                onClick={() => handlePickup('partial', 10)}
              >
                <span>⚠️ {t('partially_segregated', 'Partial Segregation')}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>+10 {t('points', 'Points')}</span>
              </button>

              <button
                type="button"
                className="btn btn-danger"
                style={{ flexDirection: 'column', height: 85, fontSize: '1.05rem' }}
                disabled={isSaving}
                onClick={() => handlePickup('incorrect', 0)}
              >
                <span>❌ {t('not_segregated', 'Mixed / Contaminated')}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>0 {t('points', 'Points')}</span>
              </button>

              <button
                type="button"
                className="btn btn-neutral"
                style={{ flexDirection: 'column', height: 85, fontSize: '1.05rem' }}
                disabled={isSaving}
                onClick={() => handlePickup('no_waste', 0)}
              >
                <span>🚪 {t('not_collected_skipped', 'No Waste Available')}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>0 {t('points', 'Points')} ({t('streak_kept', 'Streak Kept')})</span>
              </button>
            </div>
          </div>
        )}

        {/* Last Saved Confirmation Alert */}
        {lastSaved && (
          <div style={{
            padding: '1rem',
            background: 'var(--primary-light)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>
                {t('save', 'Recorded')} {lastSaved.code}
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                {lastSaved.result} ({lastSaved.points} pts) · {lastSaved.source} at {lastSaved.time}
              </div>
            </div>
            <span className="badge badge-success">Saved to Outbox</span>
          </div>
        )}

        </div>

        {/* Box 2: Live Incoming Route SMS Messages Stream Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📡</span>
              <span>{t('recent_sms_stream', 'Recent Collector SMS Route Stream')}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {smsFeed.length} {t('messages_logged', 'messages logged')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 520, overflowY: 'auto' }}>
            {smsFeed.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)' }}>
                    {item.householdCode}
                  </span>
                  <span className={`badge ${calculateSegregationRating([], 3, item.householdCode).badgeClass}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', fontWeight: 700 }}>
                    {calculateSegregationRating([], 3, item.householdCode).tag}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {item.phone}
                  </span>
                  <span style={{ fontStyle: 'italic', color: 'var(--text-main)' }}>
                    "{item.rawMessage}"
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${item.badgeClass}`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}>
                    {getStatusLabel(item.status)}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.points > 0 ? '#15803d' : '#64748b' }}>
                    +{item.points} pts
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(scannedCode) => setHouseholdCode(scannedCode)}
        expectedPrefix="CL:H:"
        title={t('scan_qr', 'Scan QR Code')}
      />
    </div>
  );
}
