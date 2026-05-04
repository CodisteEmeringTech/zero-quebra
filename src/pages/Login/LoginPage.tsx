import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login, ApiError } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { LanguageToggle } from '../../components/LanguageToggle';
import '../../components/languageToggle.css';
import './login.css';

const DEMO = [
  { email: 'admin@zeroquebra.dev',       label: 'Admin',                 role: 'ADMIN' },
  { email: 'coo@zeroquebra.dev',         label: 'Carlos COO',            role: 'COO' },
  { email: 'manager.l07@zeroquebra.dev', label: 'Mariana — Loja 7',     role: 'STORE_MANAGER' },
  { email: 'manager.l14@zeroquebra.dev', label: 'Marcos — Loja 14',     role: 'STORE_MANAGER' },
  { email: 'sup.l07@zeroquebra.dev',     label: 'Sofia — Loja 7',       role: 'SUPERVISOR' },
  { email: 'sup.l14@zeroquebra.dev',     label: 'Sérgio — Loja 14',     role: 'SUPERVISOR' },
];

export function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const setUser = useAuthStore(s => s.setUser);
  const [email, setEmail] = useState('admin@zeroquebra.dev');
  const [password, setPassword] = useState('zero1234');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const u = await login(email, password);
      setUser(u);
      nav('/', { replace: true });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('login.error_generic'));
    } finally { setLoading(false); }
  };

  return (
    <div className="login-stage">
      <div className="login-lang"><LanguageToggle variant="auth" /></div>
      <div className="login-card">
        <div className="login-brand">
          <span className="login-mark">●</span>
          <span>{t('brand')}</span>
        </div>
        <h1>{t('login.title')}</h1>
        <p className="login-sub">{t('login.subtitle')}</p>
        <form onSubmit={submit} className="login-form">
          <label>
            <span>{t('login.email')}</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" />
          </label>
          <label>
            <span>{t('login.password')}</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {err && <div className="login-err">{err}</div>}
          <button type="submit" disabled={loading}>{loading ? t('login.submitting') : t('login.submit')}</button>
        </form>

        <div className="login-demo">
          <span className="login-demo-tag">{t('login.demo_accounts')}</span>
          <div className="login-demo-grid">
            {DEMO.map(d => (
              <button
                key={d.email}
                type="button"
                onClick={() => { setEmail(d.email); setPassword('zero1234'); }}
              >
                <strong>{d.label}</strong>
                <em>{t(`roles.${d.role}`)}</em>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
