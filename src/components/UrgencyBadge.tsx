import { useTranslation } from 'react-i18next';
import './urgencyBadge.css';

type Status = 'SAFE' | 'AMBER' | 'CRITICAL' | 'ACTION_TAKEN';

export function UrgencyBadge({ status }: { status: Status }) {
  const { t } = useTranslation();
  const labelKey =
    status === 'SAFE' ? 'operator.status_safe'
    : status === 'AMBER' ? 'operator.status_amber'
    : status === 'CRITICAL' ? 'operator.status_critical'
    : 'operator.status_action_taken';
  return <span className={`badge badge-${status}`}>{t(labelKey)}</span>;
}
