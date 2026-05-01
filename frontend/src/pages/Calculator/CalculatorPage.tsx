import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/PageHeader';
import '../../components/page.css';
import './calculator.css';

// The brief explicitly forbids R$ absolute figures on this screen ("commercial terms,
// pricing, and ROI figures are managed separately by Heinrich Co. and are not included here").
// So we surface only operational metrics: % shrinkage reduction, target rate, units recovered,
// and timeline.
//
// Demo scope: 3 seeded stores × 7 anchor SKUs. The brief positions production at 16 stores ×
// 200 SKUs; admin can add more stores/SKUs through the UI during the demo if needed.
type Scenario = 'A' | 'B' | 'C';

const BASELINE_PCT = 6.03;             // brief: pre-AI FLV baseline
const ACTIVE_FLV_SKUS = 7;             // seeded
const STORE_COUNT = 3;                 // seeded
// Monthly perishable throughput at the seeded scale:
//   7 SKUs × 3 stores × ~50 units/SKU/store/day × 30 days ≈ 31,500 units/month.
const MONTHLY_UNITS = 31_500;

const SCENARIOS: Record<Scenario, {
  targetPct: number;
  timelineKey: string;
}> = {
  A: { targetPct: 5.30, timelineKey: 'calculator.timeline_value_a' },
  B: { targetPct: 4.60, timelineKey: 'calculator.timeline_value_b' },
  C: { targetPct: 3.80, timelineKey: 'calculator.timeline_value_c' },
};

export function CalculatorPage() {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<Scenario>('B');

  const fmtInt = (n: number) => n.toLocaleString(i18n.language === 'en' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 0 });

  return (
    <div className="page">
      <PageHeader title={t('calculator.title')} subtitle={t('calculator.subtitle')} />

      <section className="calc-current">
        <div className="calc-current-block">
          <span>{t('calculator.current_baseline')}</span>
          <strong>{BASELINE_PCT.toFixed(2)}%</strong>
        </div>
        <div className="calc-current-block">
          <span>{t('calculator.current_skus')}</span>
          <strong>{ACTIVE_FLV_SKUS}</strong>
        </div>
        <div className="calc-current-block">
          <span>{t('calculator.current_stores')}</span>
          <strong>{STORE_COUNT}</strong>
        </div>
      </section>

      <section className="calc-grid">
        {(Object.keys(SCENARIOS) as Scenario[]).map(sc => {
          const def = SCENARIOS[sc];
          const reductionPct = +(BASELINE_PCT - def.targetPct).toFixed(2);
          const reductionRel = +((reductionPct / BASELINE_PCT) * 100).toFixed(1);
          const unitsPerMonth = Math.round(MONTHLY_UNITS * (reductionPct / 100));
          const isOn = active === sc;
          return (
            <article key={sc} className={`calc-card ${isOn ? 'on' : ''}`} onClick={() => setActive(sc)}>
              <header>
                <span className="calc-card-tag">{t('calculator.scenario')} {sc}</span>
                <h2>{t(`calculator.scenario_${sc.toLowerCase()}`)}</h2>
              </header>
              <dl>
                <div>
                  <dt>{t('calculator.shrinkage_target')}</dt>
                  <dd>{def.targetPct.toFixed(2)}%</dd>
                </div>
                <div>
                  <dt>{t('calculator.shrinkage_reduction')}</dt>
                  <dd>−{reductionPct.toFixed(2)} pp <span className="calc-rel">({reductionRel}%)</span></dd>
                </div>
                <div>
                  <dt>{t('calculator.units_recovered')}</dt>
                  <dd>{fmtInt(unitsPerMonth)}</dd>
                </div>
                <div>
                  <dt>{t('calculator.timeline')}</dt>
                  <dd>{t(def.timelineKey)}</dd>
                </div>
              </dl>
              <button className="calc-select" onClick={(e) => { e.stopPropagation(); setActive(sc); }}>
                {isOn ? '✓ ' : ''}{t('calculator.select')}
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}
