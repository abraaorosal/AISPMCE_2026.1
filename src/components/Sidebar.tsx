import { useEffect, useState } from 'react';

import { AISLegend } from '@/components/AISLegend';
import { BattalionFilter } from '@/components/BattalionFilter';
import { InconsistencyPanel } from '@/components/InconsistencyPanel';
import { PMUnitLegend } from '@/components/PMUnitLegend';
import { RaioBaseFilter } from '@/components/RaioBaseFilter';
import { RankingList } from '@/components/RankingList';
import { SearchBox } from '@/components/SearchBox';
import type { MappedMunicipality, PMUnit, TerritoryDataset } from '@/types';

type ExplorerTab = 'ais' | 'municipality' | 'battalion' | 'raio';
type SecondaryTab = 'coverage' | 'review';

interface SidebarProps {
  battalionQuery: string;
  battalionResults: PMUnit[];
  data: TerritoryDataset;
  raioBaseQuery: string;
  raioBaseResults: PMUnit[];
  searchQuery: string;
  searchResults: MappedMunicipality[];
  selectedAisId: string | null;
  selectedBattalion: PMUnit | null;
  selectedRaioBase: PMUnit | null;
  selectedMunicipality: MappedMunicipality | null;
  onBattalionQueryChange: (value: string) => void;
  onRaioBaseQueryChange: (value: string) => void;
  onClearSelection: () => void;
  onOpenHelp: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectAis: (aisId: string | null) => void;
  onSelectBattalion: (battalion: PMUnit) => void;
  onSelectRaioBase: (raioBase: PMUnit) => void;
  onSelectMunicipality: (municipality: MappedMunicipality) => void;
}

export function Sidebar({
  battalionQuery,
  battalionResults,
  data,
  raioBaseQuery,
  raioBaseResults,
  searchQuery,
  searchResults,
  selectedAisId,
  selectedBattalion,
  selectedRaioBase,
  selectedMunicipality,
  onBattalionQueryChange,
  onRaioBaseQueryChange,
  onClearSelection,
  onOpenHelp,
  onSearchQueryChange,
  onSelectAis,
  onSelectBattalion,
  onSelectRaioBase,
  onSelectMunicipality,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('ais');
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>('coverage');

  useEffect(() => {
    if (searchQuery.trim() || selectedMunicipality) {
      setActiveTab('municipality');
    }
  }, [searchQuery, selectedMunicipality]);

  useEffect(() => {
    if (battalionQuery.trim() || selectedBattalion) {
      setActiveTab('battalion');
    }
  }, [battalionQuery, selectedBattalion]);

  useEffect(() => {
    if (raioBaseQuery.trim() || selectedRaioBase) {
      setActiveTab('raio');
    }
  }, [raioBaseQuery, selectedRaioBase]);

  const handleSelectAis = (aisId: string | null) => {
    onSelectAis(aisId);
  };

  const handleSelectMunicipality = (municipality: MappedMunicipality) => {
    onSelectMunicipality(municipality);
  };

  return (
    <aside className="sidebar sidebar-persistent">
      <div className="sidebar-mobile-grip" aria-hidden="true" />

      <section className="panel">
        <div className="panel__header">
          <h2>Como deseja filtrar?</h2>
          <p>Escolha por AIS, município, batalhão ou base RAIO para focar a leitura do mapa.</p>
        </div>

        <div className="sidebar-tabs" role="tablist" aria-label="Exploração territorial">
          <button
            aria-selected={activeTab === 'ais'}
            className={activeTab === 'ais' ? 'sidebar-tab active' : 'sidebar-tab'}
            role="tab"
            type="button"
            onClick={() => setActiveTab('ais')}
          >
            AIS
          </button>
          <button
            aria-selected={activeTab === 'municipality'}
            className={activeTab === 'municipality' ? 'sidebar-tab active' : 'sidebar-tab'}
            role="tab"
            type="button"
            onClick={() => setActiveTab('municipality')}
          >
            Município
          </button>
          <button
            aria-selected={activeTab === 'battalion'}
            className={activeTab === 'battalion' ? 'sidebar-tab active' : 'sidebar-tab'}
            role="tab"
            type="button"
            onClick={() => setActiveTab('battalion')}
          >
            Batalhão
          </button>
          <button
            aria-selected={activeTab === 'raio'}
            className={activeTab === 'raio' ? 'sidebar-tab active' : 'sidebar-tab'}
            role="tab"
            type="button"
            onClick={() => setActiveTab('raio')}
          >
            RAIO
          </button>
        </div>
      </section>

      {activeTab === 'ais' ? (
        <AISLegend areas={data.areas} selectedAisId={selectedAisId} onSelectAis={handleSelectAis} />
      ) : activeTab === 'battalion' ? (
        <BattalionFilter
          battalionQuery={battalionQuery}
          battalionResults={battalionResults}
          selectedBattalion={selectedBattalion}
          onChange={onBattalionQueryChange}
          onSelectBattalion={onSelectBattalion}
        />
      ) : activeTab === 'raio' ? (
        <RaioBaseFilter
          raioBaseQuery={raioBaseQuery}
          raioBaseResults={raioBaseResults}
          selectedRaioBase={selectedRaioBase}
          onChange={onRaioBaseQueryChange}
          onSelectRaioBase={onSelectRaioBase}
        />
      ) : (
        <SearchBox
          searchQuery={searchQuery}
          searchResults={searchResults}
          selectedMunicipality={selectedMunicipality}
          onChange={onSearchQueryChange}
          onSelectMunicipality={handleSelectMunicipality}
        />
      )}

      <PMUnitLegend pmUnits={data.pmUnits} />

      <details className="panel details-panel secondary-menu">
        <summary>
          <span>Menu secundário</span>
          <strong>2</strong>
        </summary>

        <div className="details-panel__body">
          <div className="secondary-menu__tabs" role="tablist" aria-label="Painéis secundários">
            <button
              aria-selected={secondaryTab === 'coverage'}
              className={secondaryTab === 'coverage' ? 'secondary-menu__tab active' : 'secondary-menu__tab'}
              role="tab"
              type="button"
              onClick={() => setSecondaryTab('coverage')}
            >
              Cobertura
            </button>
            <button
              aria-selected={secondaryTab === 'review'}
              className={secondaryTab === 'review' ? 'secondary-menu__tab active' : 'secondary-menu__tab'}
              role="tab"
              type="button"
              onClick={() => setSecondaryTab('review')}
            >
              Revisão
            </button>
          </div>

          {secondaryTab === 'coverage' ? (
            <RankingList areas={data.areas} />
          ) : (
            <InconsistencyPanel
              areas={data.areas}
              inconsistencies={data.inconsistencies}
              municipalities={data.municipalities}
            />
          )}
        </div>
      </details>

      <footer className="sidebar-footer">
        <div className="sidebar-footer__actions">
          <button className="ghost-button" type="button" onClick={onOpenHelp}>
            Ajuda
          </button>
          <button className="ghost-button" type="button" onClick={onClearSelection}>
            Limpar seleção e busca
          </button>
        </div>
      </footer>
    </aside>
  );
}
