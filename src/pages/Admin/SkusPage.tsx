import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import '../../components/page.css';

type Sku = {
  id: string;
  skuCode: string;
  productNamePt: string;
  section: string;
  baseCostBrl: number;
  baseSaleBrl: number;
  marginFloorBrl: number;
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
};
type Supplier = { id: string; name: string };

export function SkusPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Sku[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Sku | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    const [s, sup] = await Promise.all([api<Sku[]>('/skus'), api<Supplier[]>('/suppliers')]);
    setItems(s); setSuppliers(sup);
  };
  useEffect(() => { reload().catch(console.error); }, []);

  const remove = async (id: string) => {
    if (!confirm(t('skus.confirm_delete'))) return;
    await api(`/skus/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="page">
      <PageHeader title={t('skus.title')} subtitle={t('skus.subtitle', { count: items.length })} right={
        <button className="btn" onClick={() => setCreating(true)}>{t('skus.btn_new')}</button>
      } />
      <div className="card">
        <table className="data-table">
          <thead><tr>
            <th>{t('skus.col_code')}</th>
            <th>{t('skus.col_product')}</th>
            <th>{t('skus.col_section')}</th>
            <th className="num">{t('skus.col_cost')}</th>
            <th className="num">{t('skus.col_price')}</th>
            <th>{t('skus.col_supplier')}</th>
            <th></th>
          </tr></thead>
          <tbody>
            {items.map(s => (
              <tr key={s.id}>
                <td>{s.skuCode}</td>
                <td><strong>{s.productNamePt}</strong></td>
                <td>{s.section}</td>
                <td className="num">R$ {s.baseCostBrl.toFixed(2)}</td>
                <td className="num">R$ {s.baseSaleBrl.toFixed(2)}</td>
                <td>{s.supplier?.name ?? '—'}</td>
                <td style={{textAlign:'right'}}>
                  <button className="btn btn-ghost" style={{marginRight: 6}} onClick={() => setEditing(s)}>{t('common.edit')}</button>
                  <button className="btn btn-ghost" onClick={() => remove(s.id)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SkuFormModal open={creating || !!editing} initial={editing} suppliers={suppliers} onClose={() => { setCreating(false); setEditing(null); }} onSaved={reload} />
    </div>
  );
}

function SkuFormModal({ open, initial, suppliers, onClose, onSaved }: {
  open: boolean; initial: Sku | null; suppliers: Supplier[]; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ skuCode: '', productNamePt: '', section: 'FLV', baseCostBrl: 0, baseSaleBrl: 0, marginFloorBrl: 0, supplierId: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (initial) setForm({
      skuCode: initial.skuCode, productNamePt: initial.productNamePt, section: initial.section,
      baseCostBrl: initial.baseCostBrl, baseSaleBrl: initial.baseSaleBrl,
      marginFloorBrl: initial.marginFloorBrl, supplierId: initial.supplierId ?? '',
    });
    else setForm({ skuCode: '', productNamePt: '', section: 'FLV', baseCostBrl: 0, baseSaleBrl: 0, marginFloorBrl: 0, supplierId: '' });
  }, [initial, open]);
  const submit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, supplierId: form.supplierId || null, marginFloorBrl: Number(form.marginFloorBrl || form.baseCostBrl) };
      if (initial) await api(`/skus/${initial.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/skus', { method: 'POST', body: JSON.stringify(payload) });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };
  return (
    <Modal open={open} title={initial ? t('skus.modal_edit', { name: initial.productNamePt }) : t('skus.modal_new')} onClose={onClose}>
      <div className="modal-form">
        <label>{t('skus.form_code')} <input value={form.skuCode} onChange={e => setForm({...form, skuCode: e.target.value})} /></label>
        <label>{t('skus.form_name')} <input value={form.productNamePt} onChange={e => setForm({...form, productNamePt: e.target.value})} /></label>
        <label>{t('skus.form_section')} <input value={form.section} onChange={e => setForm({...form, section: e.target.value})} /></label>
        <label>{t('skus.form_cost')} <input type="number" step="0.01" value={form.baseCostBrl} onChange={e => setForm({...form, baseCostBrl: Number(e.target.value), marginFloorBrl: Number(e.target.value)})} /></label>
        <label>{t('skus.form_price')} <input type="number" step="0.01" value={form.baseSaleBrl} onChange={e => setForm({...form, baseSaleBrl: Number(e.target.value)})} /></label>
        <label>{t('skus.form_supplier')}
          <select value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})}>
            <option value="">{t('common.none')}</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn" onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </div>
    </Modal>
  );
}
