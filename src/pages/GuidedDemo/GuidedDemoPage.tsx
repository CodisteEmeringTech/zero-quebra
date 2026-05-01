import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useWsEvent } from '../../lib/useWs';
import { PageHeader } from '../../components/PageHeader';
import '../../components/page.css';

export function GuidedDemoPage() {
  const { t } = useTranslation();
  const [last, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useWsEvent((m) => {
    if (m.type === 'DEMO_TRIGGERED') setLast(t('guided_demo.msg_triggered', { sku: m.sku, store: m.store }));
    if (m.type === 'DEMO_RESET')     setLast(t('guided_demo.msg_reset'));
    if (m.type === 'ALERT_RAISED')   setLast(t('guided_demo.msg_alert_new', { product: m.alert?.inventory?.sku?.productNamePt ?? '' }));
    if (m.type === 'ACTION_CONFIRMED') setLast(t('guided_demo.msg_action_confirmed', { user: m.log?.confirmedBy?.name ?? '' }));
  });

  const trigger = async () => {
    setBusy(true);
    try { await api('/demo/trigger-headline', { method: 'POST', body: JSON.stringify({}) }); }
    finally { setBusy(false); }
  };
  const reset = async () => {
    setBusy(true);
    try { await api('/demo/reset', { method: 'POST', body: JSON.stringify({}) }); }
    finally { setBusy(false); }
  };

  return (
    <div className="page">
      <PageHeader
        title={t('guided_demo.title')}
        subtitle={t('guided_demo.subtitle')}
      />

      <div className="card card-pad">
        <p style={{margin: '0 0 16px', color: 'var(--muted)'}}>
          {t('guided_demo.intro')}
        </p>
        <div style={{display: 'flex', gap: 8}}>
          <button className="btn" onClick={trigger} disabled={busy}>{t('guided_demo.btn_trigger')}</button>
          <button className="btn btn-ghost" onClick={reset} disabled={busy}>{t('guided_demo.btn_reset')}</button>
        </div>
        {last && <p style={{marginTop: 16, color: 'var(--muted)'}}>{last}</p>}
      </div>

      <div className="card card-pad">
        <h3 style={{margin: 0, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--muted)'}}>{t('guided_demo.script_title')}</h3>
        <ol style={{paddingLeft: 18, color: 'var(--fg)', fontSize: 14, lineHeight: 1.6}}>
          <li>{t('guided_demo.script_1')}</li>
          <li>{t('guided_demo.script_2')}</li>
          <li>{t('guided_demo.script_3')}</li>
          <li>{t('guided_demo.script_4')}</li>
          <li>{t('guided_demo.script_5')}</li>
          <li>{t('guided_demo.script_6')}</li>
        </ol>
      </div>
    </div>
  );
}
