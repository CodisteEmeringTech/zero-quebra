import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useWsEvent } from '../../lib/useWs';
import { PageHeader } from '../../components/PageHeader';
import '../../components/page.css';

type LogEntry = {
  id: string;
  recommendation: string;
  discountPct: number;
  unitsAtRisk: number;
  estSavingsBrl: number;
  estMarginProtBrl: number;
  confirmedAt: string;
  store: { name: string };
  confirmedBy: { name: string; role: string };
  alert: { inventory: { sku: { productNamePt: string; skuCode: string } } };
};

export function ActionLogPage() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const reload = () => api<LogEntry[]>('/actions').then(setLogs).catch(console.error);
  useEffect(() => { reload(); }, []);
  useWsEvent((m) => { if (m.type === 'ACTION_CONFIRMED') reload(); });
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR';
  const fmtBRL = (v: number) =>
    v.toLocaleString(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <div className="page">
      <PageHeader title={t('log.title')} subtitle={t('log.subtitle', { count: logs.length })} />
      <div className="card">
        {logs.length === 0 ? <div className="empty">{t('log.empty')}</div> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('log.col_when')}</th>
                <th>{t('log.col_product')}</th>
                <th>{t('log.col_store')}</th>
                <th className="num">{t('log.col_discount')}</th>
                <th className="num">{t('log.col_units')}</th>
                <th className="num">{t('log.col_savings')}</th>
                <th className="num">{t('log.col_margin_prot')}</th>
                <th>{t('log.col_confirmed_by')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td>{new Date(l.confirmedAt).toLocaleString(locale)}</td>
                  <td><strong>{l.alert.inventory.sku.productNamePt}</strong> <span style={{color: 'var(--muted)', marginLeft: 6}}>{l.alert.inventory.sku.skuCode}</span></td>
                  <td>{l.store.name}</td>
                  <td className="num">{l.discountPct}%</td>
                  <td className="num">{l.unitsAtRisk}</td>
                  <td className="num">{fmtBRL(l.estSavingsBrl)}</td>
                  <td className="num">{fmtBRL(l.estMarginProtBrl)}</td>
                  <td>{l.confirmedBy.name} <span className={`tag tag-${l.confirmedBy.role}`} style={{marginLeft: 6}}>{t(`roles.${l.confirmedBy.role}`)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
