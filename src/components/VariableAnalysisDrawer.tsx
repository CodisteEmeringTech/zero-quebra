import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { AIBadge } from './AIBadge';
import './variableAnalysisDrawer.css';

type Recommendation = {
  action: 'NONE' | 'MARKDOWN' | 'PROMOTE' | 'REMOVE';
  discountPct: number;
  urgency: 'SAFE' | 'AMBER' | 'CRITICAL';
  urgencyWindowHours: number;
  reasonPt: string;
  variables: { label: string; value: string }[];
  unitsAtRisk: number;
  estSavingsBrl: number;
  estMarginProtBrl: number;
  confidence: number;
};

type Response = {
  recommendation: Recommendation;
  processingMs: number;
  scenario: 'A' | 'B' | 'C';
};

type Props = {
  inventoryId: string | null;
  productName?: string;
  storeName?: string;
  shelf?: string;
  onClose: () => void;
};

export function VariableAnalysisDrawer({ inventoryId, productName, storeName, shelf, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inventoryId) { setData(null); return; }
    setLoading(true);
    api<Response>(`/inventory/${inventoryId}/recommendation`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [inventoryId]);

  useEffect(() => {
    if (!inventoryId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inventoryId, onClose]);

  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR';
  const fmtBRL = (v: number) =>
    v.toLocaleString(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <AnimatePresence>
      {inventoryId && (
        <>
          <motion.div
            className="vad-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="vad-panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={e => e.stopPropagation()}
          >
            <header className="vad-head">
              <div className="vad-head-top">
                <AIBadge variant="pulse" />
                <button className="vad-close" onClick={onClose} aria-label="Close">×</button>
              </div>
              <span className="vad-tag">{t('ai.drawer_subtitle')}</span>
              <h2>{productName ?? '—'}</h2>
              <p className="vad-meta">
                {storeName} {shelf ? ` · ${shelf}` : ''}
              </p>
              {data && (
                <p className="vad-engine-line">
                  {t('ai.engine_name')} · {t('ai.ai_processed_variables', { count: data.recommendation.variables.length })} · {t('ai.ai_processed_in', { ms: data.processingMs })}
                </p>
              )}
            </header>

            {loading && <div className="vad-loading">{t('common.loading')}</div>}

            {data && (
              <>
                <ul className="vad-list">
                  {data.recommendation.variables.map((v, i) => (
                    <motion.li
                      key={v.label}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.20 + i * 0.25, duration: 0.35, ease: 'easeOut' }}
                    >
                      <span className="vad-label">{v.label}</span>
                      <span className="vad-value">{v.value}</span>
                    </motion.li>
                  ))}
                </ul>

                <motion.div
                  className={`vad-rec ur-${data.recommendation.urgency}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.20 + data.recommendation.variables.length * 0.25 + 0.15 }}
                >
                  <span className="vad-rec-label">{t('ai.rec_block_label')}</span>
                  <strong>
                    {data.recommendation.action === 'NONE'
                      ? '—'
                      : `${data.recommendation.action === 'MARKDOWN' ? 'Markdown' : data.recommendation.action} ${data.recommendation.discountPct}%`}
                  </strong>
                  <em>{data.recommendation.reasonPt}</em>

                  <div className="vad-rec-grid">
                    <div>
                      <span>{t('ai.confidence')}</span>
                      <strong>{data.recommendation.confidence}%</strong>
                      <div className="vad-conf-track">
                        <motion.div
                          className="vad-conf-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${data.recommendation.confidence}%` }}
                          transition={{ delay: 0.20 + data.recommendation.variables.length * 0.25 + 0.5, duration: 0.6 }}
                        />
                      </div>
                    </div>
                    {data.recommendation.estSavingsBrl > 0 && (
                      <div>
                        <span>{t('mobile.savings_label')}</span>
                        <strong>{fmtBRL(data.recommendation.estSavingsBrl)}</strong>
                      </div>
                    )}
                    {data.recommendation.estMarginProtBrl > 0 && (
                      <div>
                        <span>{t('mobile.margin_label')}</span>
                        <strong>{fmtBRL(data.recommendation.estMarginProtBrl)}</strong>
                      </div>
                    )}
                  </div>
                </motion.div>

                <p className="vad-foot">{t('ai.deterministic_note')}</p>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
