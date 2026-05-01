import { useTranslation } from 'react-i18next';
import { setLanguage } from '../lib/i18n';

const LANGS = [
  { code: 'pt-BR', label: 'PT' },
  { code: 'en',    label: 'EN' },
] as const;

type Variant = 'sidebar' | 'auth';

export function LanguageToggle({ variant = 'sidebar' }: { variant?: Variant }) {
  const { i18n } = useTranslation();
  const current = i18n.language === 'en' ? 'en' : 'pt-BR';
  return (
    <div className={`lang-toggle lang-toggle-${variant}`} role="group" aria-label="Language">
      {LANGS.map(l => (
        <button
          key={l.code}
          type="button"
          className={current === l.code ? 'on' : ''}
          onClick={() => setLanguage(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
