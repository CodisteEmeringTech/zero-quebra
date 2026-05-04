// Self-seeding startup helper.
//
// Runs on every backend boot — but only actually seeds when the User table
// is empty. This makes Railway (or any other) deployments self-bootstrapping:
// the first time the service starts against a fresh Postgres it populates
// stores, SKUs, inventory, COO history, learning loop, and demo accounts.
// Subsequent boots see existing users and skip the seed.

import bcrypt from 'bcryptjs';
import type { PrismaClient, Role } from '@prisma/client';

// Centralised demo password. Change here, redeploy, every demo account on
// every connected DB picks it up via ensureDemoPasswords() on next boot.
export const DEMO_PASSWORD = 'zero1234';

const DEMO_EMAILS = [
  'admin@zeroquebra.dev',
  'coo@zeroquebra.dev',
  'manager.l07@zeroquebra.dev',
  'manager.l14@zeroquebra.dev',
  'sup.l07@zeroquebra.dev',
  'sup.l14@zeroquebra.dev',
];

let s = 42;
const rand = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
const pick = <T,>(arr: T[]): T => arr[intBetween(0, arr.length - 1)] as T;

const STORES = [
  { code: 'L05', name: 'Loja 5',  city: 'Guarulhos', shrink: 5.0, demo: true },
  { code: 'L07', name: 'Loja 7',  city: 'São Paulo', shrink: 5.9, demo: true },
  { code: 'L14', name: 'Loja 14', city: 'São José dos Campos', shrink: 4.3, demo: true },
];

const SUPPLIERS = [
  { name: 'Hortifruti Paulista', email: 'compras@hfpaulista.com.br', phone: '+55 11 3000-1000' },
  { name: 'Frutas do Vale',      email: 'comercial@frutasdovale.com.br', phone: '+55 19 4000-2200' },
  { name: 'Verde Campo FLV',     email: 'pedidos@verdecampo.com.br', phone: '+55 12 5500-3300' },
  { name: 'Cooperativa Sul',     email: 'vendas@coopsul.com.br', phone: '+55 16 6700-4400' },
];

const PRODUCTS_MANDATORY = [
  { name: 'Morango',       cost: 9.37, sale: 15.19, expHrs: [12, 36],   demand: 'high'   },
  { name: 'Maçã',          cost: 7.02, sale: 13.99, expHrs: [120, 168], demand: 'high'   },
  { name: 'Pimentão',      cost: 5.51, sale: 10.39, expHrs: [72, 96],   demand: 'medium' },
  { name: 'Tomate',        cost: 8.29, sale: 13.19, expHrs: [72, 120],  demand: 'high'   },
  { name: 'Batata',        cost: 6.27, sale:  9.99, expHrs: [240, 336], demand: 'high'   },
  { name: 'Repolho',       cost: 8.39, sale: 11.29, expHrs: [120, 168], demand: 'medium' },
  { name: 'Mamão Formosa', cost: 3.99, sale:  6.39, expHrs: [48, 96],   demand: 'medium' },
];

const SHELVES = ['A1','A2','A3','B1','B2','B3','B4','C1','C2','C3'];

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  console.log('[initData] seeding empty database…');

  const supplierIds: string[] = [];
  for (const sup of SUPPLIERS) {
    const created = await prisma.supplier.create({
      data: { name: sup.name, contactEmail: sup.email, phone: sup.phone },
    });
    supplierIds.push(created.id);
  }

  const stores: Record<string, string> = {};
  for (const st of STORES) {
    const created = await prisma.store.create({
      data: {
        storeCode: st.code, name: st.name, city: st.city,
        shrinkagePct30d: st.shrink, activeInDemo: st.demo,
      },
    });
    stores[st.code] = created.id;
  }

  const skuIds: Record<string, string> = {};
  for (let i = 0; i < PRODUCTS_MANDATORY.length; i++) {
    const p = PRODUCTS_MANDATORY[i]!;
    const code = p.name.replace(/[^A-Za-zÀ-ú]/g, '').slice(0, 4).toUpperCase() + '-' + String(i + 1).padStart(3, '0');
    const created = await prisma.sku.create({
      data: {
        skuCode: code,
        productNamePt: p.name,
        section: 'FLV',
        baseCostBrl: p.cost,
        baseSaleBrl: p.sale,
        marginFloorBrl: p.cost,
        supplierId: pick(supplierIds),
      },
    });
    skuIds[p.name] = created.id;
  }

  for (const st of STORES) {
    const storeId = stores[st.code]!;
    for (const p of PRODUCTS_MANDATORY) {
      const isHeadline = st.code === 'L07' && p.name === 'Morango';
      const demandCoef = p.demand === 'high' ? 1 : p.demand === 'medium' ? 0.7 : 0.4;
      const stock    = isHeadline ? 40   : intBetween(8, 80);
      const hours    = isHeadline ? 18   : intBetween(p.expHrs[0]!, p.expHrs[1]!);
      const velocity = isHeadline ? 1.1  : +(between(0.3, 1.6) * demandCoef).toFixed(2);
      const sold     = isHeadline ? 22   : intBetween(2, Math.max(3, Math.floor(velocity * 6)));
      const shelf    = isHeadline ? 'B4' : pick(SHELVES);
      const dowi     = isHeadline ? 0.87 : +between(0.7, 1.25).toFixed(2);
      await prisma.inventory.create({
        data: {
          skuId: skuIds[p.name]!,
          storeId,
          shelf,
          unitsInStock: stock,
          hoursToExpiry: hours,
          unitsSoldToday: sold,
          velocityPerHour: velocity,
          dayOfWeekIndex: dowi,
          weatherSensitivity: +between(0.0, 0.9).toFixed(2),
          isHeadline,
          urgencyTier: 'SAFE',
        },
      });
    }
  }

  // 30-day COO trend: 6.03% (pre-AI baseline) → 4.60% target
  const days = 30;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - d);
    const t = (days - 1 - d) / (days - 1);
    const noise = (rand() - 0.5) * 0.30;
    const shrink = +(6.03 - (6.03 - 4.60) * t + noise).toFixed(2);
    const savings = Math.round((1800 + 1400 * t + (rand() - 0.5) * 560) * 16);
    const actions = Math.round(28 + 110 * t + (rand() - 0.5) * 16);
    await prisma.cooDailyMetric.create({
      data: {
        storeId: null,
        date,
        shrinkagePct: Math.max(3.8, shrink),
        savingsBrl: Math.max(20000, savings),
        actionsConfirmed: Math.max(20, actions),
      },
    });
  }

  // 8-week learning loop (71% → 94% per the brief)
  for (let w = 1; w <= 8; w++) {
    const t = (w - 1) / 7;
    const acc = +(71 + 23 * t + (rand() - 0.5) * 1.2).toFixed(1);
    await prisma.learningWeek.create({
      data: { week: w, accuracyPct: Math.max(70, Math.min(95, acc)) },
    });
  }

  // 6 demo accounts — all use password 'zero1234'
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users: { email: string; name: string; role: Role; storeId: string | null }[] = [
    { email: 'admin@zeroquebra.dev',       name: 'Ana Admin',         role: 'ADMIN',         storeId: null },
    { email: 'coo@zeroquebra.dev',         name: 'Carlos COO',        role: 'COO',           storeId: null },
    { email: 'manager.l07@zeroquebra.dev', name: 'Mariana — Loja 7',  role: 'STORE_MANAGER', storeId: stores['L07']! },
    { email: 'manager.l14@zeroquebra.dev', name: 'Marcos — Loja 14',  role: 'STORE_MANAGER', storeId: stores['L14']! },
    { email: 'sup.l07@zeroquebra.dev',     name: 'Sofia — Loja 7',    role: 'SUPERVISOR',    storeId: stores['L07']! },
    { email: 'sup.l14@zeroquebra.dev',     name: 'Sérgio — Loja 14',  role: 'SUPERVISOR',    storeId: stores['L14']! },
  ];
  for (const u of users) {
    await prisma.user.create({
      data: { email: u.email, name: u.name, passwordHash: password, role: u.role, storeId: u.storeId },
    });
  }

  console.log('[initData] seeded: 3 stores · 7 SKUs · 21 inventory rows · 30d COO · 8w learning · 6 users');
}

export async function seedIfEmpty(prisma: PrismaClient): Promise<void> {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log(`[initData] DB already populated (${userCount} users) — skipping seed`);
      return;
    }
    await seedDatabase(prisma);
  } catch (err) {
    // Don't crash the server if seeding fails — log so the operator can fix it,
    // and let the API come up so they can at least hit /api/health.
    console.error('[initData] seed-on-empty failed:', err);
  }
}

// Sync the demo accounts' password to whatever DEMO_PASSWORD is currently set
// to in source. Runs on every boot so changing the password in code + redeploy
// is enough to update an already-seeded DB without wiping it. Only touches the
// 6 known demo emails — leaves any user-created accounts alone.
export async function ensureDemoPasswords(prisma: PrismaClient): Promise<void> {
  try {
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const updated = await prisma.user.updateMany({
      where: { email: { in: DEMO_EMAILS } },
      data:  { passwordHash: hash },
    });
    if (updated.count > 0) {
      console.log(`[initData] synced demo password on ${updated.count} accounts`);
    }
  } catch (err) {
    console.error('[initData] ensureDemoPasswords failed:', err);
  }
}
