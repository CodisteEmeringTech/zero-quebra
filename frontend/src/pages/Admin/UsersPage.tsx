import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import '../../components/page.css';

type Role = 'ADMIN' | 'COO' | 'STORE_MANAGER' | 'SUPERVISOR';
type User = { id: string; email: string; name: string; role: Role; storeId: string | null; store: { name: string } | null };
type Store = { id: string; name: string };

export function UsersPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    const [u, s] = await Promise.all([api<User[]>('/users'), api<Store[]>('/stores')]);
    setItems(u); setStores(s);
  };
  useEffect(() => { reload().catch(console.error); }, []);

  const remove = async (id: string) => {
    if (!confirm(t('users.confirm_delete'))) return;
    await api(`/users/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="page">
      <PageHeader title={t('users.title')} subtitle={t('users.subtitle', { count: items.length })} right={
        <button className="btn" onClick={() => setCreating(true)}>{t('users.btn_new')}</button>
      } />
      <div className="card">
        <table className="data-table">
          <thead><tr>
            <th>{t('users.col_name')}</th>
            <th>{t('users.col_email')}</th>
            <th>{t('users.col_role')}</th>
            <th>{t('users.col_store')}</th>
            <th></th>
          </tr></thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td><span className={`tag tag-${u.role}`}>{t(`roles.${u.role}`)}</span></td>
                <td>{u.store?.name ?? '—'}</td>
                <td style={{textAlign:'right'}}>
                  <button className="btn btn-ghost" style={{marginRight: 6}} onClick={() => setEditing(u)}>{t('common.edit')}</button>
                  <button className="btn btn-ghost" onClick={() => remove(u.id)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <UserFormModal open={creating || !!editing} initial={editing} stores={stores} onClose={() => { setCreating(false); setEditing(null); }} onSaved={reload} />
    </div>
  );
}

function UserFormModal({ open, initial, stores, onClose, onSaved }: {
  open: boolean; initial: User | null; stores: Store[]; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<{ email: string; name: string; password: string; role: Role; storeId: string }>({
    email: '', name: '', password: '', role: 'STORE_MANAGER', storeId: '',
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (initial) setForm({ email: initial.email, name: initial.name, password: '', role: initial.role, storeId: initial.storeId ?? '' });
    else setForm({ email: '', name: '', password: '', role: 'STORE_MANAGER', storeId: '' });
  }, [initial, open]);
  const submit = async () => {
    setSaving(true);
    try {
      if (initial) {
        const payload: Record<string, unknown> = { name: form.name, role: form.role, storeId: form.storeId || null };
        if (form.password) payload.password = form.password;
        await api(`/users/${initial.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        const payload = { email: form.email, name: form.name, password: form.password, role: form.role, storeId: form.storeId || null };
        await api('/users', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved(); onClose();
    } finally { setSaving(false); }
  };
  const needsStore = form.role === 'STORE_MANAGER' || form.role === 'SUPERVISOR';
  return (
    <Modal open={open} title={initial ? t('users.modal_edit', { name: initial.name }) : t('users.modal_new')} onClose={onClose}>
      <div className="modal-form">
        {!initial && <label>{t('users.form_email')} <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></label>}
        <label>{t('users.form_name')} <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></label>
        <label>{t('users.form_password')} {initial && <span style={{color:'var(--muted)', fontSize:11, marginLeft: 6, textTransform: 'none', letterSpacing: 0}}>{t('users.form_password_keep_hint')}</span>}
          <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        </label>
        <label>{t('users.form_role')}
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value as Role})}>
            <option value="ADMIN">{t('roles.ADMIN')}</option>
            <option value="COO">{t('roles.COO')}</option>
            <option value="STORE_MANAGER">{t('roles.STORE_MANAGER')}</option>
            <option value="SUPERVISOR">{t('roles.SUPERVISOR')}</option>
          </select>
        </label>
        {needsStore && (
          <label>{t('users.form_store')}
            <select value={form.storeId} onChange={e => setForm({...form, storeId: e.target.value})}>
              <option value="">{t('users.store_none')}</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn" onClick={submit} disabled={saving || !form.name || (!initial && (!form.email || !form.password))}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </div>
    </Modal>
  );
}
