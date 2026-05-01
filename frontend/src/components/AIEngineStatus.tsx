import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useWsEvent } from '../lib/useWs';
import { AIBadge } from './AIBadge';
import './aiEngineStatus.css';

type Status = {
  engine: string;
  type: string;
  variables: number;
  scanIntervalMs: number;
  lastRunAt: string | null;
  lastRunMs: number;
  lastScanned: number;
  lastRaised: number;
  totalRuns: number;
};

export function AIEngineStatus() {
  const { t, i18n } = useTranslation();
  const [s, setS] = useState<Status | null>(null);

  const reload = () => api<Status>('/ai/status').then(setS).catch(() => {});
  useEffect(() => {
    reload();
    const id = setInterval(reload, 5000);
    return () => clearInterval(id);
  }, []);
  useWsEvent((m) => {
    if (m.type === 'ALERT_RAISED' || m.type === 'ACTION_CONFIRMED' || m.type === 'DEMO_TRIGGERED') reload();
  });

  if (!s) return null;
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR';
  const lastScanLabel = s.lastRunAt
    ? new Date(s.lastRunAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div className="ai-status">
      <AIBadge variant="pulse" />
      <span className="ai-status-engine">{s.engine}</span>
      <span className="ai-status-sep">·</span>
      <span className="ai-status-meta">{t('ai.scan_every', { seconds: Math.round(s.scanIntervalMs / 1000) })}</span>
      <span className="ai-status-sep">·</span>
      <span className="ai-status-meta">{t('ai.last_scan', { time: lastScanLabel })}</span>
      <span className="ai-status-sep">·</span>
      <span className="ai-status-meta">{t('ai.scanned_count', { count: s.lastScanned })}</span>
      {s.lastRaised > 0 && (
        <>
          <span className="ai-status-sep">·</span>
          <span className="ai-status-raised">{t('ai.raised_count', { count: s.lastRaised })}</span>
        </>
      )}
    </div>
  );
}
