import React from 'react';
import { useTranslation } from 'react-i18next';

export function MunicipalDashboard() {
  const { t } = useTranslation();

  const wardStats = [
    { ward: 'Ward 12 (Shivajinagar)', coverage: '94%', collections: 1420, segregationRate: '88%', status: 'Optimal' },
    { ward: 'Ward 14 (Kothrud North)', coverage: '89%', collections: 1180, segregationRate: '82%', status: 'Optimal' },
    { ward: 'Ward 18 (Hadapsar Central)', coverage: '76%', collections: 940, segregationRate: '64%', status: 'Needs Review' },
    { ward: 'Ward 22 (Aundh Sub-area)', coverage: '98%', collections: 1650, segregationRate: '93%', status: 'Optimal' }
  ];

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Ward,Household Coverage,Daily Collections,Segregation Quality Rate,Status\n"
      + wardStats.map(e => `${e.ward},${e.coverage},${e.collections},${e.segregationRate},${e.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "circularlink_municipal_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '1.5rem auto', padding: '0 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>🏛️ {t('municipal_viewer')} (Municipal Oversight)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            City Circular Economy Performance · Aggregate Traceability Stream (DPDP Pseudonymous)
          </p>
        </div>
        <button className="btn btn-outline" onClick={exportCSV}>
          📥 Export CSV Report
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Diverted from Landfill</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: '0.25rem 0' }}>142.8 T</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>↑ 12% vs last month</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>City Segregation Rate</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: '0.25rem 0' }}>84.2%</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>Across 4 pilot wards</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Waste Pickers</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: '0.25rem 0' }}>324</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct facility integration</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Audit Hash Integrity</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', margin: '0.25rem 0' }}>100%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0 broken chain links</div>
        </div>
      </div>

      {/* Ward Performance Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Ward Segregation & Collection Coverage</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Ward Name</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Household Coverage</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Daily Pickups</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Segregation Quality</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {wardStats.map((w, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{w.ward}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{w.coverage}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{w.collections}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, maxWidth: 80 }}>
                      <div style={{ width: w.segregationRate, height: 6, background: 'var(--primary)', borderRadius: 3 }}></div>
                    </div>
                    <span>{w.segregationRate}</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span className={`badge ${w.status === 'Optimal' ? 'badge-success' : 'badge-warning'}`}>
                    {w.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notice according to Section 18.3 */}
      <div style={{
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        background: '#f1f5f9',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        💡 <strong>EPR Notice (Section 18.3):</strong> CircularLink provides measured evidence (the Recycling Evidence Pack) that supports statutory reporting on CPCB online portals.
      </div>
    </div>
  );
}
