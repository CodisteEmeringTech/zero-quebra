import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useWsEvent } from '../../lib/useWs';
import { VariableAnalysisDrawer } from '../../components/VariableAnalysisDrawer';
import { AIBadge } from '../../components/AIBadge';
import './mobile.css';

type Alert = {
  id: string;
  inventoryId: string;
  urgency: 'AMBER' | 'CRITICAL';
  discountPct: number;
  reasonPt: string;
  unitsAtRisk: number;
  hoursToExpiry: number;
  estSavingsBrl: number;
  estMarginProtBrl: number;
  confidencePct: number;
  createdAt: string;
  inventory: {
    shelf: string;
    sku: { productNamePt: string; skuCode: string };
    store: { name: string; storeCode: string };
  };
};

function formatCountdown(seconds: number) {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function MobileSupervisorPage() {
  const { t, i18n } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [view, setView] = useState<'queue' | 'detail'>('queue');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<Alert | null>(null);
  const [, setTick] = useState(0);

  const reload = async () => {
    const data = await api<Alert[]>('/alerts?status=PENDING');
    setAlerts(data);
    if (selectedId && !data.find(a => a.id === selectedId)) {
      setSelectedId(null);
      setView('queue');
    }
  };

  useEffect(() => { reload().catch(console.error); /* eslint-disable-next-line */ }, []);
  useWsEvent((msg) => {
    if (msg.type === 'ALERT_RAISED' || msg.type === 'ACTION_CONFIRMED' || msg.type === 'ALERT_DISMISSED' || msg.type === 'DEMO_RESET') {
      reload().catch(() => {});
    }
  });
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);

  const confirm = async (id: string) => {
    setConfirmingId(id);
    try {
      await api(`/alerts/${id}/confirm`, { method: 'POST', body: JSON.stringify({}) });
      // reload happens via WS; also clear local state
      setSelectedId(null);
      setView('queue');
    } finally { setConfirmingId(null); }
  };

  const open = (id: string) => { setSelectedId(id); setView('detail'); };
  const back = () => { setView('queue'); setSelectedId(null); };

  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR';
  const fmtBRL = (v: number) =>
    v.toLocaleString(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
  const countLabel = alerts.length === 1
    ? t('mobile.headline_count_one', { count: alerts.length })
    : t('mobile.headline_count_other', { count: alerts.length });

  const selected = alerts.find(a => a.id === selectedId) ?? null;

  return (
    <div className="mobile-stage">
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="phone-statusbar">
            <span>{new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
            <span>•••</span>
          </div>

          <header className="m-head">
            <span className="m-tag">{t('mobile.title')}</span>
            <h1 className="m-headline-count">{countLabel}</h1>
          </header>

          {view === 'queue' && (
            alerts.length === 0 ? (
              <main className="m-idle">
                <p>{t('mobile.no_alerts')}</p>
              </main>
            ) : (
              <main className="m-queue-full">
                <span className="m-tag" style={{ paddingLeft: 24 }}>{t('mobile.queue_next')}</span>
                <ul className="m-queue-list">
                  {alerts.map(a => (
                    <li key={a.id}>
                      <button onClick={() => open(a.id)} className={`m-queue-row urgency-${a.urgency.toLowerCase()}`}>
                        <div className="m-queue-row-main">
                          <strong>{a.inventory.sku.productNamePt}</strong>
                          <span className="m-queue-row-meta">{a.inventory.store.name} · {a.inventory.shelf}</span>
                        </div>
                        <div className="m-queue-row-right">
                          <span className="m-queue-row-discount">{a.discountPct}%</span>
                          <span className={`m-queue-row-tag ${a.urgency.toLowerCase()}`}>
                            {a.urgency === 'CRITICAL' ? t('mobile.alert_critical') : t('mobile.alert_amber')}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="m-queue-hint">{t('mobile.tap_to_open')}</p>
              </main>
            )
          )}

          {view === 'detail' && selected && (
            <main className="m-alert">
              <button className="m-back" onClick={back}>← {t('mobile.back_to_queue', { count: alerts.length })}</button>

              <span className={`m-alert-tag ${selected.urgency.toLowerCase()}`}>
                {selected.urgency === 'CRITICAL' ? t('mobile.alert_critical') : t('mobile.alert_amber')}
              </span>
              <h1>{selected.inventory.sku.productNamePt.toUpperCase()}</h1>
              <p className="m-meta">
                {t('mobile.store_section_shelf', { store: selected.inventory.store.name, shelf: selected.inventory.shelf })}
              </p>

              <p className="m-instruction">
                {t('mobile.instruction', { discount: selected.discountPct })}
              </p>

              <div className="m-card-row">
                <div className="m-card">
                  {(() => {
                    // Action window — how long the supervisor has to act on the
                    // recommendation. Brief: 2h for AMBER, 1h for CRITICAL.
                    const urgencyWindow = selected.urgency === 'CRITICAL' ? 1 : 2;
                    return (
                      <>
                        <span>{t('mobile.urgency_label', { hours: urgencyWindow })}</span>
                        <strong>{formatCountdown(urgencyWindow * 3600 - Math.floor((Date.now() - new Date(selected.createdAt).getTime()) / 1000))}</strong>
                      </>
                    );
                  })()}
                </div>
                <div className="m-card">
                  <span>{t('mobile.at_risk_label', { units: selected.unitsAtRisk })}</span>
                </div>
              </div>

              <div className="m-card-row">
                <div className="m-card">
                  <span>{t('mobile.savings_label')}</span>
                  <strong>{fmtBRL(selected.estSavingsBrl)}</strong>
                </div>
                <div className="m-card">
                  <span>{t('mobile.margin_label')}</span>
                  <strong>{fmtBRL(selected.estMarginProtBrl)}</strong>
                </div>
              </div>

              <button
                className="m-view-ai"
                onClick={() => setAnalyzing(selected)}
              >
                <span style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                  <AIBadge variant="inline" /> {t('ai.view_analysis')}
                </span>
              </button>

              <button
                className="m-confirm"
                onClick={() => confirm(selected.id)}
                disabled={confirmingId === selected.id}
              >
                {confirmingId === selected.id ? t('mobile.confirming') : t('mobile.confirm')}
              </button>
            </main>
          )}
        </div>
      </div>

      <VariableAnalysisDrawer
        inventoryId={analyzing?.inventoryId ?? null}
        productName={analyzing?.inventory.sku.productNamePt}
        storeName={analyzing?.inventory.store.name}
        shelf={analyzing?.inventory.shelf}
        onClose={() => setAnalyzing(null)}
      />
    </div>
  );
}
