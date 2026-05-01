import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { LanguageToggle } from '../components/LanguageToggle';
import '../components/languageToggle.css';
import './shell.css';

type Role = 'ADMIN' | 'COO' | 'STORE_MANAGER' | 'SUPERVISOR';
type NavItem = { to: string; key: string; roles: Role[]; group?: string };

const NAV: NavItem[] = [
  { to: '/',              key: 'nav.home',          roles: ['ADMIN', 'COO', 'STORE_MANAGER', 'SUPERVISOR'] },
  { to: '/inventory',     key: 'nav.inventory',     roles: ['ADMIN', 'STORE_MANAGER'] },
  { to: '/alerts',        key: 'nav.alerts',        roles: ['ADMIN', 'STORE_MANAGER', 'SUPERVISOR'] },
  { to: '/mobile',        key: 'nav.mobile_frame',  roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/coo',           key: 'nav.coo',           roles: ['ADMIN', 'COO'] },
  { to: '/calculator',    key: 'nav.calculator',    roles: ['ADMIN', 'COO'] },
  { to: '/log',           key: 'nav.history',       roles: ['ADMIN', 'COO', 'STORE_MANAGER', 'SUPERVISOR'] },
  { to: '/admin/stores',     key: 'nav.stores',     roles: ['ADMIN'], group: 'nav.admin' },
  { to: '/admin/suppliers',  key: 'nav.suppliers',  roles: ['ADMIN'], group: 'nav.admin' },
  { to: '/admin/skus',       key: 'nav.skus',       roles: ['ADMIN'], group: 'nav.admin' },
  { to: '/admin/users',      key: 'nav.users',      roles: ['ADMIN'], group: 'nav.admin' },
  { to: '/demo',          key: 'nav.guided_demo',   roles: ['ADMIN'] },
];

export function Shell() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user)!;
  const signOut = useAuthStore(s => s.signOut);
  const nav = useNavigate();

  const items = NAV.filter(n => n.roles.includes(user.role));
  const grouped = items.reduce<Record<string, NavItem[]>>((acc, n) => {
    const k = n.group ?? '';
    (acc[k] = acc[k] || []).push(n);
    return acc;
  }, {});

  const onSignOut = () => { signOut(); nav('/login', { replace: true }); };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sb-brand">
          <span className="sb-mark">●</span>
          <span>{t('brand')}</span>
        </div>
        {Object.entries(grouped).map(([group, list]) => (
          <nav key={group}>
            {group && <span className="sb-group">{t(group)}</span>}
            {list.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `sb-link${isActive ? ' on' : ''}`}>
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
        ))}
        <div className="sb-spacer" />
        <div className="sb-lang">
          <LanguageToggle />
        </div>
        <div className="sb-user">
          <strong>{user.name}</strong>
          <span>{t(`roles.${user.role}`)}</span>
          <button onClick={onSignOut}>{t('nav.sign_out')}</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
