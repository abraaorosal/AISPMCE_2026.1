import cpraioLogo from '@/assets/branding/logo-cpraio.jpeg';
import pmceLogo from '@/assets/branding/logo-pmce.png';
import { getPMUnitCategoryColor, getPMUnitCategoryLabel } from '@/config/pmUnits';
import type { PMUnit } from '@/types';

interface PMUnitLegendProps {
  pmUnits: PMUnit[];
}

const CATEGORY_CONFIG = [
  {
    key: 'batalhoes',
    description: 'Batalhões territoriais da PMCE',
    icon: { type: 'image' as const, src: pmceLogo, alt: 'Símbolo da PMCE' },
  },
  {
    key: 'bases_raio',
    description: 'Bases do RAIO nos municípios',
    icon: { type: 'image' as const, src: cpraioLogo, alt: 'Símbolo do CPRAIO' },
  },
  {
    key: 'unidades_especializadas',
    description: 'Apoio especializado no mapa',
    icon: { type: 'swatch' as const },
  },
  {
    key: 'comandos',
    description: 'Comandos e estruturas centrais',
    icon: { type: 'swatch' as const },
  },
];

export function PMUnitLegend({ pmUnits }: PMUnitLegendProps) {
  const categoryCounts = pmUnits.reduce<Record<string, number>>((accumulator, unit) => {
    accumulator[unit.categoryKey] = (accumulator[unit.categoryKey] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <section className="panel pm-unit-legend">
      <div className="panel__header">
        <h2>Estruturas da PM</h2>
        <p>Veja rapidamente como cada estrutura aparece no mapa.</p>
      </div>

      <div className="pm-unit-legend__list" aria-label="Legenda das estruturas da PM">
        {CATEGORY_CONFIG.map((category) => (
          <article key={category.key} className="pm-unit-legend__item">
            <div className="pm-unit-legend__identity">
              {category.icon.type === 'image' ? (
                <img
                  alt={category.icon.alt}
                  className="pm-unit-legend__icon"
                  src={category.icon.src}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="pm-unit-legend__swatch"
                  style={{ backgroundColor: getPMUnitCategoryColor(category.key) }}
                />
              )}

              <div className="pm-unit-legend__content">
                <strong>{getPMUnitCategoryLabel(category.key)}</strong>
                <span>{category.description}</span>
              </div>
            </div>

            <span className="pm-unit-legend__count">{categoryCounts[category.key] ?? 0}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
