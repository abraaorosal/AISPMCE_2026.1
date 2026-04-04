import type { AISArea } from '@/types';

interface RankingListProps {
  areas: AISArea[];
}

export function RankingList({ areas }: RankingListProps) {
  const ranking = [...areas]
    .filter((area) => area.municipalityCount > 0)
    .sort((left, right) => right.municipalityCount - left.municipalityCount)
    .slice(0, 8);
  const maxCount = ranking[0]?.municipalityCount ?? 1;

  return (
    <section className="secondary-panel-block">
      <div className="panel__header">
        <h2>Cobertura</h2>
        <p>Veja quais AIS alcançam mais municípios no mapa atual.</p>
      </div>

      <div className="ranking-list">
        {ranking.map((area) => (
          <div key={area.id} className="ranking-list__item">
            <div className="ranking-list__label">
              <strong>{area.id}</strong>
              <span>{area.municipalityCount} municípios</span>
            </div>

            <div className="ranking-list__bar-track">
              <div
                className="ranking-list__bar"
                style={{
                  width: `${(area.municipalityCount / maxCount) * 100}%`,
                  backgroundColor: area.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
