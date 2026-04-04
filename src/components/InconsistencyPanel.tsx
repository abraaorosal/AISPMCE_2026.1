import type { AISArea, MappingInconsistency, MappedMunicipality } from '@/types';

interface InconsistencyPanelProps {
  areas: AISArea[];
  inconsistencies: MappingInconsistency[];
  municipalities: MappedMunicipality[];
}

export function InconsistencyPanel({
  areas,
  inconsistencies,
  municipalities,
}: InconsistencyPanelProps) {
  const unassignedMunicipalities = municipalities.filter(
    (municipality) => municipality.coverageStatus === 'urban-detail-unassigned',
  );

  return (
    <section className="secondary-panel-block">
      <div className="panel__header panel__header--split">
        <div>
          <h2>Revisão da base</h2>
          <p>Itens que ainda precisam de ajuste manual ou de base territorial mais detalhada.</p>
        </div>
        <strong>{inconsistencies.length}</strong>
      </div>

      <div className="details-panel__body">
        {unassignedMunicipalities.length ? (
          <div className="issue-block">
            <h3>Municípios sem AIS única</h3>
            <div className="issue-tags">
              {unassignedMunicipalities.map((municipality) => (
                <span key={municipality.id} className="issue-tag neutral">
                  {municipality.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {areas
          .filter((area) => area.scope === 'urban-detail' || area.missingCount > 0)
          .map((area) => (
            <div key={area.id} className="issue-block">
              <div className="issue-block__header">
                <strong>{area.id}</strong>
                <span>
                  {area.scope === 'urban-detail'
                    ? 'Falta base detalhada para esta área'
                    : `${area.missingCount} nomes sem correspondência`}
                </span>
              </div>

              <div className="issue-tags">
                {area.missingEntries.slice(0, 8).map((entry) => (
                  <span key={`${area.id}-${entry}`} className="issue-tag">
                    {entry}
                  </span>
                ))}

                {area.missingEntries.length > 8 ? (
                  <span className="issue-tag neutral">
                    +{area.missingEntries.length - 8} registros
                  </span>
                ) : null}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
