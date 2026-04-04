import cpraioLogo from '@/assets/branding/logo-cpraio.jpeg';
import type { PMUnit } from '@/types';

interface RaioBaseFilterProps {
  raioBaseQuery: string;
  raioBaseResults: PMUnit[];
  selectedRaioBase: PMUnit | null;
  onChange: (value: string) => void;
  onSelectRaioBase: (raioBase: PMUnit) => void;
}

export function RaioBaseFilter({
  raioBaseQuery,
  raioBaseResults,
  selectedRaioBase,
  onChange,
  onSelectRaioBase,
}: RaioBaseFilterProps) {
  const hasQuery = raioBaseQuery.trim().length > 0;

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Buscar base RAIO</h2>
        <p>Veja em qual AIS e município cada base RAIO está sediada.</p>
      </div>

      <div className="search-field">
        <input
          type="search"
          placeholder="Ex.: Russas, Fortaleza, AIS05"
          value={raioBaseQuery}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && raioBaseResults[0]) {
              event.preventDefault();
              onSelectRaioBase(raioBaseResults[0]);
            }
          }}
        />

        {hasQuery ? (
          <button className="search-clear" type="button" onClick={() => onChange('')}>
            Limpar
          </button>
        ) : null}
      </div>

      {selectedRaioBase ? (
        <div className="selected-pm-unit">
          <div className="selected-pm-unit__head">
            <img
              src={cpraioLogo}
              alt="CPRAIO"
              className="selected-pm-unit__icon"
            />
            <div>
              <span className="caption">Base RAIO em foco</span>
              <strong>{selectedRaioBase.municipalityName ?? selectedRaioBase.shortName}</strong>
              <span className="selected-pm-unit__meta">
                {selectedRaioBase.aisId ?? 'Sem AIS definida'}
                {selectedRaioBase.strength ? ` • efetivo ${selectedRaioBase.strength}` : ''}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="search-results__header">
        <span className="caption">{raioBaseResults.length} base(s) RAIO</span>
      </div>

      {raioBaseResults.length ? (
        <div className="search-results search-results--scroll">
          {raioBaseResults.map((raioBase) => (
            <button
              key={raioBase.id}
              className={
                selectedRaioBase?.id === raioBase.id ? 'search-result active' : 'search-result'
              }
              type="button"
              onClick={() => onSelectRaioBase(raioBase)}
            >
              <div className="battalion-result">
                <img
                  src={cpraioLogo}
                  alt=""
                  aria-hidden="true"
                  className="battalion-result__icon"
                />
                <div className="battalion-result__content">
                  <strong>{raioBase.municipalityName ?? raioBase.shortName}</strong>
                  <span>{raioBase.aisId ?? 'Sem AIS'} • Base RAIO</span>
                  {raioBase.strength ? <small>Efetivo informado: {raioBase.strength}</small> : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted-text">Nenhuma base RAIO encontrada com esse termo.</p>
      )}
    </section>
  );
}
