import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { api } from '../../lib/api';
import { useWsEvent } from '../../lib/useWs';
import { PageHeader } from '../../components/PageHeader';
import { AIBadge } from '../../components/AIBadge';
import { AIEngineStatus } from '../../components/AIEngineStatus';
import './coo.css';
import '../../components/page.css';

type Dashboard = {
  today: { date: string; shrinkagePct: number; savingsBrl: number; actionsConfirmed: number } | null;
  preAiBaselinePct: number;
  baselineAvg: number;
  savingsThisWeek: number;
  liveSavingsThisWeek: number;
  liveMarginThisWeek: number;
  todayActions: number;
  weekActions: number;
  coo30d: { date: string; shrinkagePct: number }[];
  learning: { week: number; accuracyPct: number }[];
  stores: { storeCode: string; name: string; shrinkagePct30d: number }[];
};

export function CooPage() {
  const { t, i18n } = useTranslation();
  const [d, setD] = useState<Dashboard | null>(null);
  const [scenario, setScenario] = useState<'A' | 'B' | 'C'>('B');

  const reload = () => api<Dashboard>('/coo/dashboard').then(setD).catch(console.error);
  useEffect(() => { reload(); }, []);
  useWsEvent((m) => { if (m.type === 'ACTION_CONFIRMED' || m.type === 'DEMO_RESET') reload(); });

  if (!d) return <div className="page"><div className="empty">{t('common.loading')}</div></div>;

  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR';
  const fmtCurrency = (v: number) =>
    v.toLocaleString(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const trendData = d.coo30d.map(x => ({ date: x.date.slice(5, 10), shrinkage: x.shrinkagePct }));
  const storeData = [...d.stores].sort((a, b) => a.shrinkagePct30d - b.shrinkagePct30d)
    .map(s => ({ store: s.storeCode, shrinkage: s.shrinkagePct30d }));

  return (
    <div className="page">
      <PageHeader
        title={t('coo.title')}
        subtitle={t('coo.subtitle')}
        right={
          <>
            <AIBadge variant="pulse" />
            <div className="seg">
              {(['A','B','C'] as const).map(sc => (
                <button key={sc} className={scenario === sc ? 'on' : ''} onClick={() => setScenario(sc)}>
                  {t('coo.scenario_label')} {sc}
                </button>
              ))}
            </div>
          </>
        }
      />
      <AIEngineStatus />

      <section className="coo-kpis">
        <div className="kpi kpi-primary">
          <span className="kpi-label">{t('coo.kpi_shrinkage_today')}</span>
          <strong>{d.today?.shrinkagePct.toFixed(2) ?? '—'}%</strong>
          <span className="kpi-sub">
            {t('coo.kpi_baseline_pre_ai')} {d.preAiBaselinePct.toFixed(2)}% · {t('coo.kpi_baseline_30d')} {d.baselineAvg.toFixed(2)}%
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{t('coo.kpi_savings_week')}</span>
          <strong>{fmtCurrency(d.savingsThisWeek)}</strong>
          {d.liveSavingsThisWeek > 0 && (
            <span className="kpi-sub">{t('coo.kpi_live_savings')}: {fmtCurrency(d.liveSavingsThisWeek)}</span>
          )}
        </div>
        <div className="kpi">
          <span className="kpi-label">{t('coo.kpi_margin_week')}</span>
          <strong>{fmtCurrency(d.liveMarginThisWeek || 0)}</strong>
          <span className="kpi-sub">{t('coo.kpi_actions')}: {d.weekActions} ({t('coo.kpi_today_actions', { count: d.todayActions })})</span>
        </div>
      </section>

      <section className="coo-charts">
        <article className="chart-card">
          <h3>{t('coo.chart_trend_30d')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--hairline)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} domain={[3.5, 6.5]} />
              <Tooltip />
              <Line type="monotone" dataKey="shrinkage" stroke="var(--brand-black)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <h3>{t('coo.chart_store_compare')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={storeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--hairline)" vertical={false} />
              <XAxis dataKey="store" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} domain={[0, 7]} />
              <Tooltip />
              <Bar dataKey="shrinkage" fill="var(--brand-green)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        {scenario === 'C' && (
          <article className="chart-card">
            <h3>{t('coo.chart_learning')}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.learning} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--hairline)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} domain={[65, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracyPct" stroke="var(--action-taken)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </article>
        )}
      </section>
    </div>
  );
}
