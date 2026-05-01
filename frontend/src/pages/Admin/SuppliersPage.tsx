import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import '../../components/page.css';

type Supplier = { id: string; name: string; contactEmail: string | null; phone: string | null; _count: { skus: number } };

export function SuppliersPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = () => api<Supplier[]>('/suppliers').then(setItems);
  useEffect(() => { reload(); }, []);

  const remove = async (id: string) => {
    if (!confirm(t('suppliers.confirm_delete'))) return;
    await api(`/suppliers/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="page">
      <PageHeader title={t('suppliers.title')} subtitle={t('suppliers.subtitle', { count: items.length })} right={
        <button className="btn" onClick={() => setCreating(true)}>{t('suppliers.btn_new')}</button>
      } />
      <div className="card">
        <table className="data-table">
          <thead><tr>
            <th>{t('suppliers.col_name')}</th>
            <th>{t('suppliers.col_email')}</th>
            <th>{t('suppliers.col_phone')}</th>
            <th className="num">{t('suppliers.col_skus')}</th>
            <th></th>
          </tr></thead>
          <tbody>
            {items.map(s => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td>{s.contactEmail ?? '—'}</td>
                <td>{s.phone ?? '—'}</td>
                <td className="num">{s._count.skus}</td>
                <td style={{textAlign:'right'}}>
                  <button className="btn btn-ghost" style={{marginRight: 6}} onClick={() => setEditing(s)}>{t('common.edit')}</button>
                  <button className="btn btn-ghost" onClick={() => remove(s.id)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SupplierFormModal open={creating || !!editing} initial={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={reload} />
    </div>
  );
}

function SupplierFormModal({ open, initial, onClose, onSaved }: { open: boolean; initial: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', contactEmail: '', phone: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (initial) setForm({ name: initial.name, contactEmail: initial.contactEmail ?? '', phone: initial.phone ?? '' });
    else setForm({ name: '', contactEmail: '', phone: '' });
  }, [initial, open]);
  const submit = async () => {
    setSaving(true);
    try {
      const payload = { name: form.name, contactEmail: form.contactEmail || null, phone: form.phone || null };
      if (initial) await api(`/suppliers/${initial.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/suppliers', { method: 'POST', body: JSON.stringify(payload) });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };
  return (
    <Modal open={open} title={initial ? t('suppliers.modal_edit', { name: initial.name }) : t('suppliers.modal_new')} onClose={onClose}>
      <div className="modal-form">
        <label>{t('suppliers.form_name')} <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></label>
        <label>{t('suppliers.form_email')} <input type="email" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} /></label>
        <label>{t('suppliers.form_phone')} <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn" onClick={submit} disabled={saving || !form.name}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </div>
    </Modal>
  );
}
