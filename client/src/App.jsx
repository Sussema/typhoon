import React, { useState } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { CollectorScreen } from './pages/CollectorScreen.jsx';
import { AggregatorScreen } from './pages/AggregatorScreen.jsx';
import { FacilityOperatorScreen } from './pages/FacilityOperatorScreen.jsx';
import { RecyclerScreen } from './pages/RecyclerScreen.jsx';
import { MunicipalDashboard } from './pages/MunicipalDashboard.jsx';
import { AdminScreen } from './pages/AdminScreen.jsx';

export default function App() {
  const [activeRole, setActiveRole] = useState('aggregator');
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <main style={{ flex: 1, paddingBottom: '3rem' }}>
        {activeRole === 'collector' && <CollectorScreen />}
        {activeRole === 'aggregator' && <AggregatorScreen />}
        {activeRole === 'facility_operator' && <FacilityOperatorScreen />}
        {activeRole === 'recycler' && <RecyclerScreen />}
        {activeRole === 'municipal_viewer' && <MunicipalDashboard />}
        {activeRole === 'admin' && <AdminScreen />}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '1.5rem',
        borderTop: '1px solid var(--border)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        background: 'white'
      }}>
        <div><strong>CircularLink</strong> · Built to MITSUI-PS-01 Specification (Team Typhoon)</div>
        <div style={{ marginTop: '0.25rem' }}>
          React PWA · Node.js Express API · PostgreSQL Append-Only Ledger · Web Serial & QR Capture
        </div>
      </footer>
    </div>
  );
}
