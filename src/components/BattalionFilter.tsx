import pmceLogo from '@/assets/branding/logo-pmce.png';
import type { PMUnit } from '@/types';

interface BattalionFilterProps {
  battalionQuery: string;
  battalionResults: PMUnit[];
  selectedBattalion: PMUnit | null;
  onChange: (value: string) => void;
  onSelectBattalion: (battalion: PMUnit) => void;
}

export function BattalionFilter({
  battalionQuery,
  battalionResults,
  selectedBattalion,
  onChange,
  onSelectBattalion,
}: BattalionFilterProps) {
  const hasQuery = battalionQuery.trim().length > 0;

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Buscar batalhão</h2>
        <p>Veja em qual AIS e município cada batalhão está sediado.</p>
      </div>

      <div className="search-field">
        <input
          type="search"
          placeholder="Ex.: 1º BPM, 12º BPM, Russas"
          value={battalionQuery}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && battalionResults[0]) {
              event.preventDefault();
              onSelectBattalion(battalionResults[0]);
            }
          }}
        />

        {hasQuery ? (
          <button className="search-clear" type="button" onClick={() => onChange('')}>
            Limpar
          </button>
        ) : null}
      </div>

      {selectedBattalion ? (
        <div className="selected-pm-unit">
          <div className="selected-pm-unit__head">
            <img
              src={pmceLogo}
              alt="PMCE"
              className="selected-pm-unit__icon"
            />
            <div>
              <span className="caption">Batalhão em foco</span>
              <strong>{selectedBattalion.shortName}</strong>
              <span className="selected-pm-unit__meta">
                {selectedBattalion.municipalityName ?? 'Município não informado'}
              </span>
            </div>
          </div>
          <span className="selected-municipality__badge">
            {selectedBattalion.aisId ?? 'Sem AIS definida'}
          </span>
        </div>
      ) : null}

      <div className="search-results__header">
        <span className="caption">{battalionResults.length} batalhão(ões)</span>
      </div>

      {battalionResults.length ? (
        <div className="search-results search-results--scroll">
          {battalionResults.map((battalion) => (
            <button
              key={battalion.id}
              className={
                selectedBattalion?.id === battalion.id ? 'search-result active' : 'search-result'
              }
              type="button"
              onClick={() => onSelectBattalion(battalion)}
            >
              <div className="battalion-result">
                <img
                  src={pmceLogo}
                  alt=""
                  aria-hidden="true"
                  className="battalion-result__icon"
                />
                <div className="battalion-result__content">
                  <strong>{battalion.shortName}</strong>
                  <span>
                    {battalion.municipalityName ?? 'Município não informado'} •{' '}
                    {battalion.aisId ?? 'Sem AIS'}
                  </span>
                  {battalion.name !== battalion.shortName ? <small>{battalion.name}</small> : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted-text">Nenhum batalhão encontrado com esse termo.</p>
      )}
    </section>
  );
}
