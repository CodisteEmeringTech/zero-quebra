import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useWsEvent } from '../../lib/useWs';
import { PageHeader } from '../../components/PageHeader';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { Modal } from '../../components/Modal';
import { AIBadge } from '../../components/AIBadge';
import { AIEngineStatus } from '../../components/AIEngineStatus';
import { VariableAnalysisDrawer } from '../../components/VariableAnalysisDrawer';
import '../../components/page.css';

type InvRow = {
  id: string; skuId: string; storeId: string;
  shelf: string; unitsInStock: number; hoursToExpiry: number;
  unitsSoldToday: number; velocityPerHour: number;
  urgencyTier: 'SAFE' | 'AMBER' | 'CRITICAL';
  isHeadline: boolean;
  sku: { skuCode: string; productNamePt: string; baseSaleBrl: number; marginFloorBrl: number };
  store: { storeCode: string; name: string };
};

type Store = { id: string; name: string; storeCode: string };

export function InventoryPage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user)!;
  const [rows, setRows] = useState<InvRow[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState<string>(user.storeId ?? 'ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<InvRow | null>(null);
  const [restocking, setRestocking] = useState<InvRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState<InvRow | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const params = storeFilter !== 'ALL' ? `?storeId=${storeFilter}` : '';
    const [items, sts] = await Promise.all([
      api<InvRow[]>(`/inventory${params}`),
      user.role === 'ADMIN' ? api<Store[]>('/stores') : Promise.resolve([] as Store[]),
    ]);
    setRows(items); setStores(sts);
    setLoading(false);
  };

  useEffect(() => { reload().catch(console.error); /* eslint-disable-next-line */ }, [storeFilter]);

  useWsEvent((msg) => {
    if (msg.type === 'ALERT_RAISED' || msg.type === 'ACTION_CONFIRMED' || msg.type === 'DEMO_TRIGGERED' || msg.type === 'DEMO_RESET') {
      reload().catch(() => {});
    }
  });

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.sku.productNamePt.toLowerCase().includes(q) ||
      r.sku.skuCode.toLowerCase().includes(q) ||
      r.store.name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const canEdit = user.role === 'ADMIN' || user.role === 'STORE_MANAGER';
  const subtitleKey = user.role === 'STORE_MANAGER' ? 'inventory.subtitle_yours' : 'inventory.subtitle_realtime';

  return (
    <div className="page">
      <PageHeader
        title={t('inventory.title')}
        subtitle={t(subtitleKey, { count: filtered.length })}
        right={
          <>
            <AIBadge variant="pulse" />
            <input className="toolbar-input" placeholder={t('common.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} />
            {user.role === 'ADMIN' && (
              <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)}>
                <option value="ALL">{t('common.all_stores')}</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {canEdit && (
              <button className="btn" onClick={() => setCreating(true)}>{t('inventory.btn_add')}</button>
            )}
          </>
        }
      />
      <AIEngineStatus />

      <div className="card">
        {loading ? <div className="empty">{t('common.loading')}</div> : filtered.length === 0 ? (
          <div className="empty">{t('common.empty')}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('inventory.col_product')}</th>
                <th>{t('inventory.col_store')}</th>
                <th>{t('inventory.col_shelf')}</th>
                <th className="num">{t('inventory.col_stock')}</th>
                <th className="num">{t('inventory.col_expiry_h')}</th>
                <th className="num">{t('inventory.col_velocity')}</th>
                <th className="num">{t('inventory.col_price')}</th>
                <th className="num">{t('inventory.col_margin')}</th>
                <th>{t('inventory.col_status')}</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const margin = r.sku.baseSaleBrl > 0 ? Math.round(((r.sku.baseSaleBrl - r.sku.marginFloorBrl) / r.sku.baseSaleBrl) * 1000) / 10 : 0;
                return (
                <tr key={r.id} className={r.isHeadline ? 'row-headline' : ''}>
                  <td><strong>{r.sku.productNamePt}</strong> <span className="tag" style={{marginLeft: 6}}>{r.sku.skuCode}</span></td>
                  <td>{r.store.name}</td>
                  <td>{r.shelf}</td>
                  <td className="num">{r.unitsInStock}</td>
                  <td className="num">{r.hoursToExpiry}</td>
                  <td className="num">{r.velocityPerHour.toFixed(2)}</td>
                  <td className="num">R$ {r.sku.baseSaleBrl.toFixed(2)}</td>
                  <td className="num">{margin.toFixed(1)}%</td>
                  <td><UrgencyBadge status={r.urgencyTier} /></td>
                  {canEdit && (
                    <td style={{textAlign: 'right'}}>
                      <button className="btn btn-ghost" style={{marginRight: 6}} onClick={() => setAnalyzing(r)} title={t('ai.view_analysis')}>{t('ai.label_short')}</button>
                      <button className="btn btn-ghost" style={{marginRight: 6}} onClick={() => setRestocking(r)}>{t('inventory.btn_restock')}</button>
                      <button className="btn btn-ghost" onClick={() => setEditing(r)}>{t('inventory.btn_edit')}</button>
                    </td>
                  )}
                </tr>
              );})}
            </tbody>
          </table>
        )}
      </div>

      <EditModal row={editing} onClose={() => setEditing(null)} onSaved={reload} />
      <RestockModal row={restocking} onClose={() => setRestocking(null)} onSaved={reload} />
      <CreateModal open={creating} onClose={() => setCreating(false)} onSaved={reload} defaultStoreId={user.storeId ?? null} />
      <VariableAnalysisDrawer
        inventoryId={analyzing?.id ?? null}
        productName={analyzing?.sku.productNamePt}
        storeName={analyzing?.store.name}
        shelf={analyzing?.shelf}
        onClose={() => setAnalyzing(null)}
      />
    </div>
  );
}

function EditModal({ row, onClose, onSaved }: { row: InvRow | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Partial<InvRow>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (row) setForm({ shelf: row.shelf, unitsInStock: row.unitsInStock, hoursToExpiry: row.hoursToExpiry, velocityPerHour: row.velocityPerHour, unitsSoldToday: row.unitsSoldToday }); }, [row]);
  if (!row) return null;
  const submit = async () => {
    setSaving(true);
    try {
      await api(`/inventory/${row.id}`, { method: 'PUT', body: JSON.stringify({
        shelf: form.shelf,
        unitsInStock: Number(form.unitsInStock),
        hoursToExpiry: Number(form.hoursToExpiry),
        velocityPerHour: Number(form.velocityPerHour),
        unitsSoldToday: Number(form.unitsSoldToday),
      }) });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };
  return (
    <Modal open={!!row} title={t('inventory.edit_title', { product: row.sku.productNamePt, store: row.store.name })} onClose={onClose}>
      <div className="modal-form">
        <label>{t('inventory.field_shelf')} <input value={form.shelf ?? ''} onChange={e => setForm(f => ({...f, shelf: e.target.value}))} /></label>
        <label>{t('inventory.field_stock')} <input type="number" value={form.unitsInStock ?? 0} onChange={e => setForm(f => ({...f, unitsInStock: Number(e.target.value)}))} /></label>
        <label>{t('inventory.field_hours_to_expiry')} <input type="number" value={form.hoursToExpiry ?? 0} onChange={e => setForm(f => ({...f, hoursToExpiry: Number(e.target.value)}))} /></label>
        <label>{t('inventory.field_velocity')} <input type="number" step="0.1" value={form.velocityPerHour ?? 0} onChange={e => setForm(f => ({...f, velocityPerHour: Number(e.target.value)}))} /></label>
        <label>{t('inventory.field_sold_today')} <input type="number" value={form.unitsSoldToday ?? 0} onChange={e => setForm(f => ({...f, unitsSoldToday: Number(e.target.value)}))} /></label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn" onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </div>
    </Modal>
  );
}

function RestockModal({ row, onClose, onSaved }: { row: InvRow | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [units, setUnits] = useState(20);
  const [hours, setHours] = useState(72);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (row) setHours(Math.max(48, row.hoursToExpiry)); }, [row]);
  if (!row) return null;
  const submit = async () => {
    setSaving(true);
    try {
      await api(`/inventory/${row.id}/restock`, { method: 'POST', body: JSON.stringify({ unitsAdded: units, hoursToExpiry: hours }) });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };
  return (
    <Modal open={!!row} title={t('inventory.restock_title', { product: row.sku.productNamePt })} onClose={onClose}>
      <div className="modal-form">
        <label>{t('inventory.field_units_added')} <input type="number" value={units} onChange={e => setUnits(Number(e.target.value))} /></label>
        <label>{t('inventory.field_new_expiry_hours')} <input type="number" value={hours} onChange={e => setHours(Number(e.target.value))} /></label>
        <p style={{color: 'var(--muted)', fontSize: 13}}>
          {t('inventory.restock_summary_pre')} <strong>{row.unitsInStock}</strong> · {t('inventory.restock_summary_after')} <strong>{row.unitsInStock + units}</strong>
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn" onClick={submit} disabled={saving}>{saving ? t('common.saving') : t('common.confirm')}</button>
        </div>
      </div>
    </Modal>
  );
}

function CreateModal({ open, onClose, onSaved, defaultStoreId }: { open: boolean; onClose: () => void; onSaved: () => void; defaultStoreId: string | null }) {
  const { t } = useTranslation();
  const [skus, setSkus] = useState<{ id: string; skuCode: string; productNamePt: string }[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [skuId, setSkuId] = useState('');
  const [storeId, setStoreId] = useState(defaultStoreId ?? '');
  const [shelf, setShelf] = useState('A1');
  const [units, setUnits] = useState(40);
  const [hours, setHours] = useState(72);
  const [velocity, setVelocity] = useState(1.0);
  const [saving, setSaving] = useState(false);
  const user = useAuthStore(s => s.user)!;

  useEffect(() => { if (open) {
    api<typeof skus>('/skus').then(setSkus);
    if (user.role === 'ADMIN') api<Store[]>('/stores').then(setStores);
  } }, [open, user.role]);

  if (!open) return null;
  const submit = async () => {
    if (!skuId || !storeId) return;
    setSaving(true);
    try {
      await api('/inventory', { method: 'POST', body: JSON.stringify({
        skuId, storeId, shelf,
        unitsInStock: units, hoursToExpiry: hours,
        velocityPerHour: velocity,
      }) });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };
  return (
    <Modal open={open} title={t('inventory.create_title')} onClose={onClose}>
      <div className="modal-form">
        <label>{t('inventory.field_sku')}
          <select value={skuId} onChange={e => setSkuId(e.target.value)}>
            <option value="">{t('common.select')}</option>
            {skus.map(s => <option key={s.id} value={s.id}>{s.productNamePt} ({s.skuCode})</option>)}
          </select>
        </label>
        {user.role === 'ADMIN' && (
          <label>{t('inventory.field_store')}
            <select value={storeId} onChange={e => setStoreId(e.target.value)}>
              <option value="">{t('common.select')}</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        <label>{t('inventory.field_shelf')} <input value={shelf} onChange={e => setShelf(e.target.value)} /></label>
        <label>{t('inventory.field_initial_stock')} <input type="number" value={units} onChange={e => setUnits(Number(e.target.value))} /></label>
        <label>{t('inventory.field_hours_to_expiry')} <input type="number" value={hours} onChange={e => setHours(Number(e.target.value))} /></label>
        <label>{t('inventory.field_velocity')} <input type="number" step="0.1" value={velocity} onChange={e => setVelocity(Number(e.target.value))} /></label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn" onClick={submit} disabled={saving || !skuId || !storeId}>{saving ? t('common.saving') : t('common.add')}</button>
        </div>
      </div>
    </Modal>
  );
}
