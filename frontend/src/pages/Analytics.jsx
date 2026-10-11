import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { AppShell } from '../components/Shell.jsx';
import { Donut, TrendChart } from '../components/Charts.jsx';
import { IconBarChart } from '../components/Icons.jsx';

export default function Analytics() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/analytics', { token }).then(setData).catch((e) => setError(e.message));
  }, [token]);

  return (
    <AppShell
      active="analytics"
      eyebrow="Administration"
      title="Analytics"
      subtitle="Verification activity over the last 14 days."
    >
      {error && <p className="error">{error}</p>}

      {!data ? (
        <p className="loading">Loading…</p>
      ) : (
        <>
          <section className="card">
            <header className="card-head">
              <h2><IconBarChart className="card-ico" /> Checks per day</h2>
            </header>
            <TrendChart
              days={data.days}
              series={[
                { name: 'Genuine', color: '--ok', values: data.genuine },
                { name: 'Not verified', color: '--warn', values: data.notVerified },
              ]}
            />
          </section>

          <div className="analytics-row">
            <section className="card">
              <header className="card-head"><h2>Match type</h2></header>
              {data.matchTypes.exact + data.matchTypes.template === 0 ? (
                <p className="sub">No matches yet.</p>
              ) : (
                <Donut
                  segments={[
                    { label: 'Exact file', value: data.matchTypes.exact, color: '--accent' },
                    { label: 'Batch template', value: data.matchTypes.template, color: '--ok' },
                  ]}
                />
              )}
            </section>

            <section className="card">
              <header className="card-head"><h2>New sign-ups</h2></header>
              <TrendChart days={data.days} series={[{ name: 'Sign-ups', color: '--accent', values: data.signups }]} height={160} />
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
