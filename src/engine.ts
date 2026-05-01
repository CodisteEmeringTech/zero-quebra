import type { Inventory, Sku } from '@prisma/client';

export type Recommendation = {
  action: 'NONE' | 'MARKDOWN' | 'PROMOTE' | 'REMOVE';
  discountPct: number;
  urgency: 'SAFE' | 'AMBER' | 'CRITICAL';
  urgencyWindowHours: number;
  reasonPt: string;
  variables: { label: string; value: string }[];
  unitsAtRisk: number;
  estSavingsBrl: number;        // expected R$ recovered by acting
  estMarginProtBrl: number;     // gross margin retained (sale - cost) per cleared unit
  confidence: number;           // 0–100, AI confidence score (deterministic)
};

export type Scenario = 'A' | 'B' | 'C';
export type Weather = 'normal' | 'hot' | 'cool';

type InvWithSku = Inventory & { sku: Sku };

export function evaluate(inv: InvWithSku, scenario: Scenario = 'B', weather: Weather = 'normal'): Recommendation {
  let velocity = inv.velocityPerHour;
  if (scenario !== 'A') velocity *= inv.dayOfWeekIndex;
  if (scenario === 'C') {
    if (weather === 'hot')  velocity *= 1 + inv.weatherSensitivity * 0.30;
    if (weather === 'cool') velocity *= 1 - inv.weatherSensitivity * 0.20;
  }

  const projectedSold = velocity * Math.max(0, inv.hoursToExpiry);
  const remaining = Math.max(0, inv.unitsInStock - projectedSold);
  const atRiskRatio = inv.unitsInStock > 0 ? remaining / inv.unitsInStock : 0;
  const unitsAtRisk = Math.round(remaining);

  let urgency: Recommendation['urgency'] = 'SAFE';
  let discount = 0;
  let action: Recommendation['action'] = 'NONE';

  if (inv.hoursToExpiry < 6 && atRiskRatio > 0.2) {
    urgency = 'CRITICAL'; discount = 40; action = 'MARKDOWN';
  } else if (atRiskRatio >= 0.4 || (atRiskRatio >= 0.25 && inv.hoursToExpiry < 18)) {
    urgency = 'AMBER'; discount = 30; action = 'MARKDOWN';
  } else if (atRiskRatio >= 0.20) {
    urgency = 'AMBER'; discount = 20; action = 'MARKDOWN';
  }

  // Margin floor clamp: discounted price must be ≥ cost (the brief explicitly states
  // "do not discount below this").
  const minPrice = inv.sku.marginFloorBrl;
  if (inv.sku.baseSaleBrl * (1 - discount / 100) < minPrice) {
    const max = Math.max(0, Math.floor((1 - minPrice / inv.sku.baseSaleBrl) * 100));
    discount = max;
    if (discount === 0) action = 'PROMOTE';
  }

  // Financials. Without action, those at-risk units would be written off (loss = cost × units).
  // With action, units are cleared at the discounted price, so:
  //   recovered_revenue = discountedPrice × unitsAtRisk
  //   marginProtected   = (discountedPrice - cost) × unitsAtRisk
  //   savings           = recovered_revenue + marginProtected — but to keep the brief's
  //                       "monetary uplift vs. doing nothing" reading, savings = discountedPrice × unitsAtRisk
  //                       (the cash that would have been zero because the units would have spoiled).
  const discountedPrice = inv.sku.baseSaleBrl * (1 - discount / 100);
  const cost = inv.sku.marginFloorBrl;
  const estSavingsBrl    = +(discountedPrice * unitsAtRisk).toFixed(2);
  const estMarginProtBrl = +(Math.max(0, discountedPrice - cost) * unitsAtRisk).toFixed(2);

  const variables = [
    { label: 'Estoque',          value: `${inv.unitsInStock} un` },
    { label: 'Validade',         value: `${inv.hoursToExpiry} h` },
    { label: 'Venda/h',          value: velocity.toFixed(2) },
    { label: 'Em risco',         value: `${unitsAtRisk} un` },
    { label: 'Piso de margem',   value: `R$ ${inv.sku.marginFloorBrl.toFixed(2)}` },
  ];
  if (scenario !== 'A') variables.splice(3, 0, { label: 'Índice dia da semana', value: inv.dayOfWeekIndex.toFixed(2) });
  if (scenario === 'C' && weather !== 'normal') variables.push({ label: 'Clima', value: weather === 'hot' ? 'Quente' : 'Fresco' });

  // Action window — how long the supervisor has to act before the recommendation
  // becomes stale. The brief example uses "Urgência: 2 horas" for an AMBER alert.
  const urgencyWindowHours = urgency === 'CRITICAL' ? 1 : urgency === 'AMBER' ? 2 : 0;

  // Confidence — deterministic derivation that scales with how strongly the variables
  // agree on action: urgent, low-velocity, high-stock, near-expiry items push it up.
  // Range 0–100. The brief asks for "plausible, consistent recommendations" — confidence
  // is the AI moment that lets the audience see the engine's certainty.
  let confidence = 50 +
    (urgency === 'CRITICAL' ? 35 : urgency === 'AMBER' ? 20 : 5) +
    Math.min(15, atRiskRatio * 30) +
    Math.max(-10, Math.min(10, (40 - inv.hoursToExpiry) / 4));
  confidence = Math.round(Math.max(0, Math.min(100, confidence)));

  return {
    action, discountPct: discount, urgency, unitsAtRisk, urgencyWindowHours,
    estSavingsBrl, estMarginProtBrl, confidence,
    reasonPt: urgency === 'SAFE'
      ? 'Sem ação recomendada'
      : `Aplicar desconto de ${discount}% agora · Urgência: ${urgencyWindowHours} horas · ${unitsAtRisk} unidades em risco serão vendidas`,
    variables,
  };
}
