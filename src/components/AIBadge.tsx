import { useTranslation } from 'react-i18next';
import './aiBadge.css';

type Props = { variant?: 'default' | 'inline' | 'pulse' };

export function AIBadge({ variant = 'default' }: Props) {
  const { t } = useTranslation();
  return (
    <span className={`ai-badge ai-badge-${variant}`} title={t('ai.deterministic_note')}>
      <span className="ai-badge-dot" aria-hidden />
      <span className="ai-badge-label">{t('ai.label_short')}</span>
    </span>
  );
}
