// Curated seed — only the 7 brief-anchor products and 3 stores.
// Admin can add more stores/SKUs/inventory through the UI during the demo if needed.
//   - 3 stores covering the brief's 4–6% shrinkage range:
//       Loja 7  (5.9% — demo headline / worst-tier)
//       Loja 14 (4.3% — best-tier)
//       Loja 5  (5.0% — median reference)
//   - 7 mandatory anchor products with the exact prices from the brief
//   - Morango · Loja 7 headline state: 40 un, 18 h to expiry, 22 sold today, shelf B4
//   - 6 demo users (Admin, COO, 2 Store Managers, 2 Supervisors)
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

let s = 42;
const rand = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
const pick = <T,>(arr: T[]): T => arr[intBetween(0, arr.length - 1)] as T;

// 3 stores covering the brief's 4–6% shrinkage range. Admin can add more via UI.
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

// EXACT prices from the brief's anchor-product table.
// (Margin floor = cost; engine clamps any discount so price >= cost.)
const PRODUCTS_MANDATORY = [
  { name: 'Morango',       cost: 9.37, sale: 15.19, expHrs: [12, 36],   demand: 'high'   },
  { name: 'Maçã',          cost: 7.02, sale: 13.99, expHrs: [120, 168], demand: 'high'   },
  { name: 'Pimentão',      cost: 5.51, sale: 10.39, expHrs: [72, 96],   demand: 'medium' },
  { name: 'Tomate',        cost: 8.29, sale: 13.19, expHrs: [72, 120],  demand: 'high'   },
  { name: 'Batata',        cost: 6.27, sale:  9.99, expHrs: [240, 336], demand: 'high'   },
  { name: 'Repolho',       cost: 8.39, sale: 11.29, expHrs: [120, 168], demand: 'medium' },
  { name: 'Mamão Formosa', cost: 3.99, sale:  6.39, expHrs: [48, 96],   demand: 'medium' },
];

// Only the 7 brief-anchor products are seeded. Admin can add filler SKUs via UI.

const SHELVES = ['A1','A2','A3','B1','B2','B3','B4','C1','C2','C3'];

async function main() {
  console.log('seed: clearing existing data');
  await prisma.actionLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.cooDailyMetric.deleteMany();
  await prisma.learningWeek.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
  await prisma.supplier.deleteMany();

  console.log('seed: stores');
  const stores: Record<string, string> = {};
  for (const st of STORES) {
    const created = await prisma.store.create({
      data: { storeCode: st.code, name: st.name, city: st.city, shrinkagePct30d: st.shrink, activeInDemo: st.demo },
    });
    stores[st.code] = created.id;
  }

  console.log('seed: suppliers');
  const supplierIds: string[] = [];
  for (const sup of SUPPLIERS) {
    const created = await prisma.supplier.create({
      data: { name: sup.name, contactEmail: sup.email, phone: sup.phone },
    });
    supplierIds.push(created.id);
  }

  console.log('seed: SKUs (7 anchor products only)');
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

  console.log('seed: inventory — 7 products × 3 stores');
  for (const st of STORES) {
    const storeId = stores[st.code]!;
    for (const p of PRODUCTS_MANDATORY) {
      const isHeadline = st.code === 'L07' && p.name === 'Morango';
      const demandCoef = p.demand === 'high' ? 1 : p.demand === 'medium' ? 0.7 : 0.4;
      // Morango · Loja 7: brief-exact starting state (40 un, 18 h, 22 sold, B4, dow 0.87, vel 1.1).
      // After trigger, demo route raises velocity to 1.40 → engine projects exactly 18 at risk → AMBER.
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

  console.log('seed: COO 30-day metrics — 6.03% baseline → declining trend');
  const days = 30;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  // Brief: pre-AI baseline = 6.03%. With AI, target trends toward 4.6% (low-end of best-store range).
  const baselineStart = 6.03;
  const baselineEnd   = 4.60;
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - d);
    const t = (days - 1 - d) / (days - 1);
    const noise = (rand() - 0.5) * 0.30;
    const shrink = +(baselineStart - (baselineStart - baselineEnd) * t + noise).toFixed(2);
    // Operational metrics only on the calculator side; for the COO 30-day record
    // we still seed savingsBrl so the historical "Savings this week" KPI has a value.
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

  console.log('seed: 8-week learning loop (71% → 94% per the brief)');
  for (let w = 1; w <= 8; w++) {
    const t = (w - 1) / 7;
    const acc = +(71 + 23 * t + (rand() - 0.5) * 1.2).toFixed(1);
    await prisma.learningWeek.create({ data: { week: w, accuracyPct: Math.max(70, Math.min(95, acc)) } });
  }

  console.log('seed: demo users');
  const password = await bcrypt.hash('zero1234', 10);
  const users = [
    { email: 'admin@zeroquebra.dev',     name: 'Ana Admin',          role: 'ADMIN'         as Role, storeId: null },
    { email: 'coo@zeroquebra.dev',       name: 'Carlos COO',         role: 'COO'           as Role, storeId: null },
    { email: 'manager.l07@zeroquebra.dev', name: 'Mariana — Loja 7',  role: 'STORE_MANAGER' as Role, storeId: stores['L07']! },
    { email: 'manager.l14@zeroquebra.dev', name: 'Marcos — Loja 14',  role: 'STORE_MANAGER' as Role, storeId: stores['L14']! },
    { email: 'sup.l07@zeroquebra.dev',     name: 'Sofia — Loja 7',    role: 'SUPERVISOR'    as Role, storeId: stores['L07']! },
    { email: 'sup.l14@zeroquebra.dev',     name: 'Sérgio — Loja 14',  role: 'SUPERVISOR'    as Role, storeId: stores['L14']! },
  ];
  for (const u of users) {
    await prisma.user.create({
      data: { email: u.email, name: u.name, passwordHash: password, role: u.role, storeId: u.storeId },
    });
  }

  console.log('seed: done');
  console.log('  Curated demo seed:');
  console.log('    · 3 stores (Loja 5 · Loja 7 · Loja 14), shrinkage 4.3%–5.9%');
  console.log('    · 7 anchor products at exact brief prices (Morango R$ 9.37/15.19, etc.)');
  console.log('    · 21 inventory rows (7 products × 3 stores)');
  console.log('    · Morango · Loja 7 headline: 40 un, 18 h, 22 sold today, shelf B4');
  console.log('    · Pre-AI shrinkage baseline 6.03% → trending to 4.60% over 30 days');
  console.log('    · Learning loop: Week 1 71% → Week 8 94%');
  console.log('    · Admin can add more stores / SKUs / inventory via UI during the demo');
  console.log('  Demo accounts (password: zero1234):');
  for (const u of users) console.log(`    · ${u.email}  (${u.role}${u.storeId ? ', ' + STORES.find(s => stores[s.code] === u.storeId)?.name : ''})`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
