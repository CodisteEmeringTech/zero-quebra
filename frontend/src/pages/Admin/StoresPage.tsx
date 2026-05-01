import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import '../../components/page.css';

type Store = { id: string; storeCode: string; name: string; city: string; shrinkagePct30d: number; activeInDemo: boolean };

export function StoresPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Store[]>([]);
  const [editing, setEditing] = useState<Store | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = () => api<Store[]>('/stores').then(setItems);
  useEffect(() => { reload(); }, []);

  const remove = async (id: string) => {
    if (!confirm(t('stores.confirm_delete'))) return;
    await api(`/stores/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="page">
      <PageHeader title={t('stores.title')} subtitle={t('stores.subtitle', { count: items.length })} right={
        <button className="btn" onClick={() => setCreating(true)}>{t('stores.btn_new')}</button>
      } />
      <div className="card">
        <table className="data-table">
          <thead><tr>
            <th>{t('stores.col_code')}</th>
            <th>{t('stores.col_name')}</th>
            <th>{t('stores.col_city')}</th>
            <th className="num">{t('stores.col_shrinkage_30d')}</th>
            <th>{t('stores.col_demo')}</th>
            <th></th>
          </tr></thead>
          <tbody>
            {items.map(s => (
              <tr key={s.id}>
                <td><strong>{s.storeCode}</strong></td>
                <td>{s.name}</td>
                <td>{s.city}</td>
                <td className="num">{s.shrinkagePct30d.toFixed(2)}%</td>
                <td>{s.activeInDemo ? <span className="tag" style={{background:'var(--brand-green)', color:'var(--brand-black)'}}>{t('common.yes').toUpperCase()}</span> : <span className="tag">{t('common.no')}</span>}</td>
                <td style={{textAlign:'right'}}>
                  <button className="btn btn-ghost" style={{marginRight: 6}} onClick={() => setEditing(s)}>{t('common.edit')}</button>
                  <button className="btn btn-ghost" onClick={() => remove(s.id)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <StoreFormModal open={creating || !!editing} initial={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={reload} />
    </div>
  );
}

function StoreFormModal({ open, initial, onClose, onSaved }: { open: boolean; initial: Store | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ storeCode: '', name: '', city: '', shrinkagePct30d: 0, activeInDemo: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setForm({ storeCode: initial.storeCode, name: initial.name, city: initial.city, shrinkagePct30d: initial.shrinkagePct30d, activeInDemo: initial.activeInDemo });
    else setForm({ storeCode: '', name: '', city: '', shrinkagePct30d: 0, activeInDemo: false });
  }, [initial, open]);

  const submit = async () => {
    setSaving(true);
    try {
      if (initial) await api(`/stores/${initial.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await api('/stores', { method: 'POST', body: JSON.stringify(form) });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };
  return (
    <Modal open={open} title={initial ? t('stores.modal_edit', { code: initial.storeCode }) : t('stores.modal_new')} onClose={onClose}>
      <div className="modal-form">
        <label>{t('stores.form_code')} <input value={form.storeCode} onChange={e => setForm({...form, storeCode: e.target.value})} /></label>
        <label>{t('stores.form_name')} <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></label>
        <label>{t('stores.form_city')} <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></label>
        <label>{t('stores.form_shrinkage')} <input type="number" step="0.1" value={form.shrinkagePct30d} onChange={e => setForm({...form, shrinkagePct30d: Number(e.target.value)})} /></label>
        <label style={{flexDirection:'row', alignItems:'center', gap: 8, textTransform:'none', letterSpacing: 0, fontSize: 14}}>
          <input type="checkbox" checked={form.activeInDemo} onChange={e => setForm({...form, activeInDemo: e.target.checked})} />
          {t('stores.form_active_in_demo')}
        </label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn" onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </div>
    </Modal>
  );
}
