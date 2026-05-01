import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useWsEvent } from '../../lib/useWs';
import { PageHeader } from '../../components/PageHeader';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { AIBadge } from '../../components/AIBadge';
import { AIEngineStatus } from '../../components/AIEngineStatus';
import { VariableAnalysisDrawer } from '../../components/VariableAnalysisDrawer';
import '../../components/page.css';

type Alert = {
  id: string;
  inventoryId: string;
  urgency: 'AMBER' | 'CRITICAL';
  recommendation: 'MARKDOWN' | 'PROMOTE' | 'REMOVE';
  discountPct: number;
  reasonPt: string;
  unitsAtRisk: number;
  hoursToExpiry: number;
  estSavingsBrl: number;
  estMarginProtBrl: number;
  confidencePct: number;
  status: 'PENDING' | 'CONFIRMED' | 'DISMISSED';
  createdAt: string;
  inventory: {
    shelf: string;
    sku: { productNamePt: string; skuCode: string };
    store: { name: string; storeCode: string };
  };
};

export function AlertsPage() {
  const { t, i18n } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'CONFIRMED' | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const status = filter === 'ALL' ? '' : `?status=${filter}`;
    const data = await api<Alert[]>(`/alerts${status}`);
    setAlerts(data);
    setLoading(false);
  };

  useEffect(() => { reload().catch(console.error); }, [filter]);
  useWsEvent((msg) => {
    if (msg.type === 'ALERT_RAISED' || msg.type === 'ACTION_CONFIRMED' || msg.type === 'ALERT_DISMISSED') {
      reload().catch(() => {});
    }
  });

  const confirm = async (id: string) => {
    await api(`/alerts/${id}/confirm`, { method: 'POST', body: JSON.stringify({}) });
    reload();
  };
  const dismiss = async (id: string) => {
    await api(`/alerts/${id}/dismiss`, { method: 'POST', body: JSON.stringify({}) });
    reload();
  };

  const emptyKey = filter === 'PENDING' ? 'alerts.empty_pending'
    : filter === 'CONFIRMED' ? 'alerts.empty_confirmed' : 'alerts.empty_any';
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR';
  const fmtBRL = (v: number) =>
    v.toLocaleString(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const [drawerAlert, setDrawerAlert] = useState<Alert | null>(null);

  return (
    <div className="page">
      <PageHeader
        title={t('alerts.title')}
        subtitle={t('alerts.subtitle', { count: alerts.length })}
        right={
          <>
            <AIBadge variant="pulse" />
            <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
              <option value="PENDING">{t('alerts.filter_pending')}</option>
              <option value="CONFIRMED">{t('alerts.filter_confirmed')}</option>
              <option value="ALL">{t('alerts.filter_all')}</option>
            </select>
          </>
        }
      />
      <AIEngineStatus />
      <div className="card">
        {loading ? <div className="empty">{t('common.loading')}</div> : alerts.length === 0 ? (
          <div className="empty">{t(emptyKey)}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('alerts.col_urgency')}</th>
                <th>{t('alerts.col_product')}</th>
                <th>{t('alerts.col_store')}</th>
                <th className="num">{t('alerts.col_discount')}</th>
                <th className="num">{t('alerts.col_units_at_risk')}</th>
                <th className="num">{t('alerts.col_savings')}</th>
                <th className="num">{t('alerts.col_margin_prot')}</th>
                <th>{t('alerts.col_created')}</th>
                {filter !== 'CONFIRMED' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.id} className="alert-row" onClick={() => setDrawerAlert(a)}>
                  <td><UrgencyBadge status={a.urgency} /></td>
                  <td><strong>{a.inventory.sku.productNamePt}</strong> <span style={{color: 'var(--muted)', marginLeft: 6}}>{a.inventory.shelf}</span></td>
                  <td>{a.inventory.store.name}</td>
                  <td className="num">{a.discountPct}%</td>
                  <td className="num">{a.unitsAtRisk}</td>
                  <td className="num">{fmtBRL(a.estSavingsBrl)}</td>
                  <td className="num">{fmtBRL(a.estMarginProtBrl)}</td>
                  <td>{new Date(a.createdAt).toLocaleTimeString(locale)}</td>
                  {filter !== 'CONFIRMED' && (
                    <td style={{textAlign: 'right'}} onClick={e => e.stopPropagation()}>
                      {a.status === 'PENDING' && (
                        <>
                          <button className="btn btn-ghost" style={{marginRight: 6}} onClick={() => dismiss(a.id)}>{t('alerts.btn_dismiss')}</button>
                          <button className="btn" onClick={() => confirm(a.id)}>{t('alerts.btn_confirm')}</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <VariableAnalysisDrawer
        inventoryId={drawerAlert?.inventoryId ?? null}
        productName={drawerAlert?.inventory.sku.productNamePt}
        storeName={drawerAlert?.inventory.store.name}
        shelf={drawerAlert?.inventory.shelf}
        onClose={() => setDrawerAlert(null)}
      />
    </div>
  );
}
