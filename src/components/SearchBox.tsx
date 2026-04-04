import type { MappedMunicipality } from '@/types';

interface SearchBoxProps {
  searchQuery: string;
  searchResults: MappedMunicipality[];
  selectedMunicipality: MappedMunicipality | null;
  onChange: (value: string) => void;
  onSelectMunicipality: (municipality: MappedMunicipality) => void;
}

export function SearchBox({
  searchQuery,
  searchResults,
  selectedMunicipality,
  onChange,
  onSelectMunicipality,
}: SearchBoxProps) {
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Buscar município</h2>
        <p>Digite o nome da cidade para localizar no mapa e ver a AIS correspondente.</p>
      </div>

      <div className="search-field">
        <input
          type="search"
          placeholder="Ex.: Sobral, Crato, Fortaleza"
          value={searchQuery}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && searchResults[0]) {
              event.preventDefault();
              onSelectMunicipality(searchResults[0]);
            }
          }}
        />

        {hasQuery ? (
          <button className="search-clear" type="button" onClick={() => onChange('')}>
            Limpar
          </button>
        ) : null}
      </div>

      {selectedMunicipality ? (
        <div className="selected-municipality">
          <div>
            <span className="caption">Município em foco</span>
            <strong>{selectedMunicipality.name}</strong>
          </div>
          <span className="selected-municipality__badge">
            {selectedMunicipality.aisId ??
              (selectedMunicipality.coverageStatus === 'submunicipal'
                ? 'Divisão exata por múltiplas AIS'
                : 'Cobertura urbana detalhada')}
          </span>
        </div>
      ) : null}

      {hasQuery ? (
        searchResults.length ? (
          <>
            <div className="search-results__header">
              <span className="caption">{searchResults.length} resultado(s)</span>
            </div>
            <div className="search-results search-results--scroll">
              {searchResults.map((municipality) => (
                <button
                  key={municipality.id}
                  className={
                    selectedMunicipality?.id === municipality.id
                      ? 'search-result active'
                      : 'search-result'
                  }
                  type="button"
                  onClick={() => onSelectMunicipality(municipality)}
                >
                  <strong>{municipality.name}</strong>
                  <span>
                    {municipality.aisId ??
                      (municipality.coverageStatus === 'submunicipal'
                        ? 'Divisão exata entre múltiplas AIS'
                        : 'Sem AIS municipal única')}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="muted-text">Nenhum município encontrado com esse termo.</p>
        )
      ) : (
        <p className="muted-text">
          A busca considera acentos, maiúsculas e espaços. Ex.: "Fortaleza", "Juazeiro" ou
          "Quixadá".
        </p>
      )}
    </section>
  );
}
