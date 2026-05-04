import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from '../locales/pt-BR.json';
import en from '../locales/en.json';

const LANG_KEY = 'zq:lang';

const stored = (typeof window !== 'undefined' ? localStorage.getItem(LANG_KEY) : null);
// Default to English; user can switch to PT-BR via the language toggle and the
// choice persists in localStorage.
const initial = stored === 'en' || stored === 'pt-BR' ? stored : 'en';

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
  },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(lng: 'pt-BR' | 'en') {
  i18n.changeLanguage(lng);
  if (typeof window !== 'undefined') localStorage.setItem(LANG_KEY, lng);
}

export default i18n;
