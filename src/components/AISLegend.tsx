import type { AISArea } from '@/types';

interface AISLegendProps {
  areas: AISArea[];
  selectedAisId: string | null;
  onSelectAis: (aisId: string | null) => void;
}

export function AISLegend({ areas, selectedAisId, onSelectAis }: AISLegendProps) {
  const sortedAreas = [...areas].sort((left, right) => {
    const leftNumber = Number(left.id.replace(/\D/g, ''));
    const rightNumber = Number(right.id.replace(/\D/g, ''));

    if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
      return left.id.localeCompare(right.id, 'pt-BR');
    }

    return leftNumber - rightNumber;
  });

  const describeArea = (area: AISArea) => {
    if (area.scope === 'submunicipal') {
      return `${area.unitCount} áreas detalhadas nesta AIS.`;
    }

    if (area.scope === 'urban-detail') {
      return 'Aguardando base detalhada para esta AIS.';
    }

    return `${area.municipalityCount} municípios ligados a esta AIS.`;
  };

  return (
    <section className="panel">
      <div className="panel__header panel__header--split">
        <div>
          <h2>Escolher AIS</h2>
          <p>Selecione uma área para destacar no mapa e ver somente o que importa.</p>
        </div>

        <button className="text-button" type="button" onClick={() => onSelectAis(null)}>
          Limpar
        </button>
      </div>

      <div className="ais-list">
        {sortedAreas.map((area) => {
          const isActive = selectedAisId === area.id;

          return (
            <button
              key={area.id}
              className={isActive ? 'ais-list__item active' : 'ais-list__item'}
              type="button"
              onClick={() => onSelectAis(area.id)}
            >
              <span className="ais-list__swatch" style={{ backgroundColor: area.color }} />

              <div className="ais-list__content">
                <div className="ais-list__title-row">
                  <strong>{area.id}</strong>
                  <span className="ais-list__count">{area.unitLabel}</span>
                </div>

                <p>{describeArea(area)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
