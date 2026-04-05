import { useEffect, useMemo, useState } from 'react';

import { AISLegend } from '@/components/AISLegend';
import { BattalionFilter } from '@/components/BattalionFilter';
import { BottomSheet, type BottomSheetTab } from '@/components/BottomSheet';
import { ErrorState } from '@/components/ErrorState';
import { GuidedHelp } from '@/components/GuidedHelp';
import { InconsistencyPanel } from '@/components/InconsistencyPanel';
import { LoadingState } from '@/components/LoadingState';
import { MapView } from '@/components/MapView';
import { PMUnitLegend } from '@/components/PMUnitLegend';
import { RaioBaseFilter } from '@/components/RaioBaseFilter';
import { RankingList } from '@/components/RankingList';
import { SearchBox } from '@/components/SearchBox';
import { Sidebar } from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTerritoryData } from '@/hooks/useTerritoryData';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { MapBounds, MappedMunicipality, PMUnit, TerritorialUnit } from '@/types';
import { includesNormalized } from '@/utils/normalize';

const PM_UNIT_FOCUS_DELTA = 0.045;
const MOBILE_SHEET_TABS: BottomSheetTab[] = [
  { id: 'ais', label: 'AIS' },
  { id: 'municipalities', label: 'Municípios' },
  { id: 'pm-units', label: 'Sedes PM' },
  { id: 'info', label: 'Info' },
];

type MobileSheetTab = 'ais' | 'municipalities' | 'pm-units' | 'info';
type MobilePmTab = 'battalion' | 'raio';

function createPointBounds(latitude: number, longitude: number): MapBounds {
  return [
    [latitude - PM_UNIT_FOCUS_DELTA, longitude - PM_UNIT_FOCUS_DELTA],
    [latitude + PM_UNIT_FOCUS_DELTA, longitude + PM_UNIT_FOCUS_DELTA],
  ];
}

export function DashboardPage() {
  const { data, isLoading, error } = useTerritoryData();
  const { theme, toggleTheme } = useThemeMode();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [selectedAisId, setSelectedAisId] = useState<string | null>(null);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string | null>(null);
  const [selectedTerritorialUnitId, setSelectedTerritorialUnitId] = useState<string | null>(null);
  const [selectedBattalionId, setSelectedBattalionId] = useState<string | null>(null);
  const [selectedRaioBaseId, setSelectedRaioBaseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [battalionQuery, setBattalionQuery] = useState('');
  const [raioQuery, setRaioQuery] = useState('');
  const [resetSequence, setResetSequence] = useState(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileSheetTab>('ais');
  const [mobilePmTab, setMobilePmTab] = useState<MobilePmTab>('battalion');

  const selectedMunicipality = data
    ? data.municipalitiesById[selectedMunicipalityId ?? ''] ?? null
    : null;
  const selectedTerritorialUnit = data
    ? data.territorialUnitsById[selectedTerritorialUnitId ?? ''] ?? null
    : null;
  const selectedBattalion = data
    ? data.pmUnitsById[selectedBattalionId ?? ''] ?? null
    : null;
  const selectedRaioBase = data
    ? data.pmUnitsById[selectedRaioBaseId ?? ''] ?? null
    : null;
  const selectedBattalionMunicipality = data && selectedBattalion?.municipalityId
    ? data.municipalitiesById[selectedBattalion.municipalityId] ?? null
    : null;
  const selectedRaioMunicipality = data && selectedRaioBase?.municipalityId
    ? data.municipalitiesById[selectedRaioBase.municipalityId] ?? null
    : null;
  const selectedArea = data?.areas.find((area) => area.id === selectedAisId) ?? null;
  const selectedPmUnits = useMemo<PMUnit[]>(() => {
    if (!data) {
      return [];
    }

    if (selectedTerritorialUnit) {
      return data.pmUnits.filter(
        (unit) => unit.municipalityId === selectedTerritorialUnit.municipalityId,
      );
    }

    if (selectedMunicipality) {
      return data.pmUnits.filter((unit) => unit.municipalityId === selectedMunicipality.id);
    }

    if (selectedArea) {
      return data.pmUnits.filter((unit) => unit.aisId === selectedArea.id);
    }

    return data.pmUnits;
  }, [data, selectedArea, selectedMunicipality, selectedTerritorialUnit]);
  const hasActiveSelection = Boolean(
    selectedAisId ||
      selectedMunicipalityId ||
      selectedTerritorialUnitId ||
      selectedBattalionId ||
      selectedRaioBaseId ||
      searchQuery.trim() ||
      battalionQuery.trim() ||
      raioQuery.trim(),
  );

  const focusSummary = useMemo(() => {
    if (selectedBattalion) {
      return {
        eyebrow: 'Batalhão em foco',
        title: selectedBattalion.shortName,
        description: `${selectedBattalion.municipalityName ?? 'Município não informado'} • ${selectedBattalion.aisId ?? 'Sem AIS definida'}`,
      };
    }

    if (selectedRaioBase) {
      return {
        eyebrow: 'Base RAIO em foco',
        title: selectedRaioBase.name,
        description: `${selectedRaioBase.municipalityName ?? 'Município não informado'} • ${selectedRaioBase.aisId ?? 'Sem AIS definida'}${selectedRaioBase.strength ? ` • efetivo ${selectedRaioBase.strength}` : ''}`,
      };
    }

    if (selectedTerritorialUnit) {
      return {
        eyebrow: 'Área interna em foco',
        title: selectedTerritorialUnit.unitName,
        description: `${selectedTerritorialUnit.municipalityName} • ${selectedTerritorialUnit.aisId ?? 'Sem AIS única'} • ${selectedPmUnits.length} estruturas da PM nesta cidade`,
      };
    }

    if (selectedMunicipality) {
      return {
        eyebrow: 'Município selecionado',
        title: selectedMunicipality.name,
        description: `${selectedMunicipality.aisId ?? 'Sem AIS única'} • ${selectedPmUnits.length} estruturas da PM nesta cidade`,
      };
    }

    if (selectedArea) {
      return {
        eyebrow: 'AIS em foco',
        title: selectedArea.id,
        description:
          selectedArea.scope === 'submunicipal'
            ? `${selectedArea.unitCount} áreas detalhadas e ${selectedPmUnits.length} estruturas da PM nesta AIS.`
            : `${selectedArea.municipalityCount} municípios e ${selectedPmUnits.length} estruturas da PM nesta AIS.`,
      };
    }

    return {
      eyebrow: 'Visão geral',
      title: 'Mapa das AIS do Ceará',
      description:
        `Use os filtros para destacar uma AIS, uma cidade ou áreas detalhadas. ${selectedPmUnits.length} estruturas da PM estão posicionadas no mapa.`,
    };
  }, [
    selectedArea,
    selectedBattalion,
    selectedMunicipality,
    selectedPmUnits.length,
    selectedRaioBase,
    selectedTerritorialUnit,
  ]);

  const searchResults = useMemo(() => {
    if (!data || !searchQuery.trim()) {
      return [];
    }

    return data.municipalities
      .filter((municipality) => includesNormalized(municipality.name, searchQuery))
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
      .slice(0, 20);
  }, [data, searchQuery]);

  const battalionResults = useMemo(() => {
    if (!data) {
      return [];
    }

    const battalions = data.pmUnits
      .filter((unit) => unit.categoryKey === 'batalhoes')
      .sort((left, right) => left.shortName.localeCompare(right.shortName, 'pt-BR'));

    if (!battalionQuery.trim()) {
      return battalions;
    }

    return battalions.filter((unit) =>
      [unit.name, unit.shortName, unit.municipalityName ?? '', unit.aisId ?? ''].some((value) =>
        includesNormalized(value, battalionQuery),
      ),
    );
  }, [battalionQuery, data]);

  const raioBaseResults = useMemo(() => {
    if (!data) {
      return [];
    }

    const raioBases = data.pmUnits
      .filter((unit) => unit.categoryKey === 'bases_raio')
      .sort(
        (left, right) =>
          left.municipalityName?.localeCompare(right.municipalityName ?? '', 'pt-BR') ?? 0,
      );

    if (!raioQuery.trim()) {
      return raioBases;
    }

    return raioBases.filter((unit) =>
      [
        unit.name,
        unit.shortName,
        unit.municipalityName ?? '',
        unit.aisId ?? '',
        unit.strength ? String(unit.strength) : '',
      ].some((value) => includesNormalized(value, raioQuery)),
    );
  }, [data, raioQuery]);

  const visibleMunicipalities = data?.municipalities ?? [];
  const visibleTerritorialUnits = data?.territorialUnits ?? [];

  const focusBounds =
    (selectedRaioMunicipality
      ? selectedRaioMunicipality.bounds
      : selectedBattalionMunicipality
        ? selectedBattalionMunicipality.bounds
        : selectedBattalion
          ? createPointBounds(selectedBattalion.latitude, selectedBattalion.longitude)
          : null) ??
    selectedTerritorialUnit?.bounds ??
    selectedMunicipality?.bounds ??
    selectedArea?.bounds ??
    data?.mapBounds ??
    null;
  const focusMode = selectedBattalion || selectedRaioBase
    ? 'pm-unit'
    : selectedTerritorialUnit
      ? 'unit'
      : selectedMunicipality
        ? 'municipality'
        : selectedArea
          ? 'ais'
          : 'overview';
  const focusKey = `${selectedBattalion?.id ?? 'none'}:${selectedRaioBase?.id ?? 'none'}:${selectedTerritorialUnit?.id ?? 'none'}:${selectedMunicipality?.id ?? 'none'}:${selectedArea?.id ?? 'all'}:${resetSequence}`;

  useEffect(() => {
    if (searchQuery.trim() || selectedMunicipality) {
      setMobileActiveTab('municipalities');
    }
  }, [searchQuery, selectedMunicipality]);

  useEffect(() => {
    if (battalionQuery.trim() || selectedBattalion) {
      setMobileActiveTab('pm-units');
      setMobilePmTab('battalion');
    }
  }, [battalionQuery, selectedBattalion]);

  useEffect(() => {
    if (raioQuery.trim() || selectedRaioBase) {
      setMobileActiveTab('pm-units');
      setMobilePmTab('raio');
    }
  }, [raioQuery, selectedRaioBase]);

  useEffect(() => {
    if (isDesktop) {
      document.documentElement.style.setProperty('--bottom-sheet-offset', '0px');
    }

    window.dispatchEvent(new Event('resize'));
  }, [isDesktop]);

  const handleSelectMunicipality = (municipality: MappedMunicipality) => {
    setSelectedBattalionId(null);
    setSelectedRaioBaseId(null);
    setBattalionQuery('');
    setRaioQuery('');
    setSelectedTerritorialUnitId(null);
    setSelectedMunicipalityId(municipality.id);
    setSelectedAisId(municipality.aisId);
    setSearchQuery(municipality.name);
  };

  const handleSelectTerritorialUnit = (unit: TerritorialUnit) => {
    setSelectedBattalionId(null);
    setSelectedRaioBaseId(null);
    setBattalionQuery('');
    setRaioQuery('');
    setSelectedTerritorialUnitId(unit.id);
    setSelectedMunicipalityId(unit.municipalityId);
    setSelectedAisId(unit.aisId);
  };

  const handleSelectBattalion = (battalion: PMUnit) => {
    setSelectedBattalionId(battalion.id);
    setSelectedRaioBaseId(null);
    setBattalionQuery(battalion.shortName);
    setRaioQuery('');
    setSelectedAisId(battalion.aisId ?? null);
    setSelectedMunicipalityId(battalion.municipalityId ?? null);
    setSelectedTerritorialUnitId(null);
    setSearchQuery('');
  };

  const handleSelectRaioBase = (raioBase: PMUnit) => {
    setSelectedRaioBaseId(raioBase.id);
    setSelectedBattalionId(null);
    setRaioQuery(raioBase.municipalityName ?? raioBase.shortName);
    setBattalionQuery('');
    setSelectedAisId(raioBase.aisId ?? null);
    setSelectedMunicipalityId(raioBase.municipalityId ?? null);
    setSelectedTerritorialUnitId(null);
    setSearchQuery('');
  };

  const handleSelectAis = (aisId: string | null) => {
    setSelectedBattalionId(null);
    setSelectedRaioBaseId(null);
    setBattalionQuery('');
    setRaioQuery('');
    const nextAisId = selectedAisId === aisId ? null : aisId;
    setSelectedAisId(nextAisId);

    if (selectedTerritorialUnit && selectedTerritorialUnit.aisId !== nextAisId) {
      setSelectedTerritorialUnitId(null);
    }

    if (
      selectedMunicipality &&
      selectedMunicipality.coverageStatus !== 'submunicipal' &&
      selectedMunicipality.aisId !== nextAisId
    ) {
      setSelectedMunicipalityId(null);
    }

    if (nextAisId) {
      setSearchQuery('');
    }
  };

  const handleClearSelection = () => {
    setSelectedAisId(null);
    setSelectedMunicipalityId(null);
    setSelectedTerritorialUnitId(null);
    setSelectedBattalionId(null);
    setSelectedRaioBaseId(null);
    setSearchQuery('');
    setBattalionQuery('');
    setRaioQuery('');
  };

  const handleResetMap = () => {
    setResetSequence((value) => value + 1);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState message={error} />;
  }

  const mobileSheetContent = (() => {
    switch (mobileActiveTab) {
      case 'municipalities':
        return (
          <SearchBox
            searchQuery={searchQuery}
            searchResults={searchResults}
            selectedMunicipality={selectedMunicipality}
            onChange={setSearchQuery}
            onSelectMunicipality={handleSelectMunicipality}
          />
        );
      case 'pm-units':
        return (
          <div className="sheet-stack">
            <section className="panel">
              <div className="panel__header">
                <h2>Sedes da PM</h2>
                <p>Alterne entre batalhões e bases RAIO para localizar cada sede no mapa.</p>
              </div>

              <div className="secondary-menu__tabs" role="tablist" aria-label="Tipos de sedes">
                <button
                  aria-selected={mobilePmTab === 'battalion'}
                  className={
                    mobilePmTab === 'battalion'
                      ? 'secondary-menu__tab active'
                      : 'secondary-menu__tab'
                  }
                  role="tab"
                  type="button"
                  onClick={() => setMobilePmTab('battalion')}
                >
                  Batalhões
                </button>
                <button
                  aria-selected={mobilePmTab === 'raio'}
                  className={
                    mobilePmTab === 'raio' ? 'secondary-menu__tab active' : 'secondary-menu__tab'
                  }
                  role="tab"
                  type="button"
                  onClick={() => setMobilePmTab('raio')}
                >
                  Base RAIO
                </button>
              </div>
            </section>

            {mobilePmTab === 'battalion' ? (
              <BattalionFilter
                battalionQuery={battalionQuery}
                battalionResults={battalionResults}
                selectedBattalion={selectedBattalion}
                onChange={setBattalionQuery}
                onSelectBattalion={handleSelectBattalion}
              />
            ) : (
              <RaioBaseFilter
                raioBaseQuery={raioQuery}
                raioBaseResults={raioBaseResults}
                selectedRaioBase={selectedRaioBase}
                onChange={setRaioQuery}
                onSelectRaioBase={handleSelectRaioBase}
              />
            )}
          </div>
        );
      case 'info':
        return (
          <div className="sheet-stack">
            <section className="panel">
              <div className="panel__header">
                <h2>Controles rápidos</h2>
                <p>Mantenha o mapa alinhado, abra a ajuda e limpe filtros sem sair do mobile.</p>
              </div>

              <div className="sheet-actions">
                <button className="primary-button" type="button" onClick={handleResetMap}>
                  Centralizar mapa
                </button>
                <button className="ghost-button" type="button" onClick={() => setIsHelpOpen(true)}>
                  Ajuda
                </button>
                {hasActiveSelection ? (
                  <button className="ghost-button" type="button" onClick={handleClearSelection}>
                    Limpar seleção e busca
                  </button>
                ) : null}
              </div>
            </section>

            <PMUnitLegend pmUnits={data.pmUnits} />
            <RankingList areas={data.areas} />
            <InconsistencyPanel
              areas={data.areas}
              inconsistencies={data.inconsistencies}
              municipalities={data.municipalities}
            />
          </div>
        );
      default:
        return (
          <AISLegend
            areas={data.areas}
            selectedAisId={selectedAisId}
            onSelectAis={handleSelectAis}
          />
        );
    }
  })();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__badge" aria-hidden="true">
            AIS
          </div>

          <div className="app-header__copy">
            <strong>Painel AIS Ceará</strong>
            <span>PMCE • CPRAIO</span>
          </div>
        </div>

        <div className="app-header__actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <div className="app-content">
        {isDesktop ? (
          <Sidebar
            battalionQuery={battalionQuery}
            battalionResults={battalionResults}
            data={data}
            raioBaseQuery={raioQuery}
            raioBaseResults={raioBaseResults}
            searchQuery={searchQuery}
            searchResults={searchResults}
            selectedAisId={selectedAisId}
            selectedBattalion={selectedBattalion}
            selectedRaioBase={selectedRaioBase}
            selectedMunicipality={selectedMunicipality}
            onBattalionQueryChange={setBattalionQuery}
            onRaioBaseQueryChange={setRaioQuery}
            onClearSelection={handleClearSelection}
            onOpenHelp={() => setIsHelpOpen(true)}
            onResetMap={handleResetMap}
            onSearchQueryChange={setSearchQuery}
            onSelectAis={handleSelectAis}
            onSelectBattalion={handleSelectBattalion}
            onSelectRaioBase={handleSelectRaioBase}
            onSelectMunicipality={handleSelectMunicipality}
          />
        ) : null}

        <main className="map-container">
          <MapView
            areas={data.areas}
            focusBounds={focusBounds}
            focusKey={focusKey}
            focusMode={focusMode}
            focusSummary={focusSummary}
            mapBounds={data.mapBounds}
            municipalities={visibleMunicipalities}
            pmUnits={data.pmUnits}
            territorialUnits={visibleTerritorialUnits}
            resetSequence={resetSequence}
            selectedAisId={selectedAisId}
            selectedBattalionId={selectedBattalionId}
            selectedRaioBaseId={selectedRaioBaseId}
            selectedMunicipalityId={selectedMunicipalityId}
            selectedTerritorialUnitId={selectedTerritorialUnitId}
            statistics={data.statistics}
            theme={theme}
            onSelectBattalion={handleSelectBattalion}
            onSelectRaioBase={handleSelectRaioBase}
            onSelectMunicipality={handleSelectMunicipality}
            onSelectTerritorialUnit={handleSelectTerritorialUnit}
          />
        </main>
      </div>

      {!isDesktop ? (
        <BottomSheet
          activeTab={mobileActiveTab}
          tabs={MOBILE_SHEET_TABS}
          topContent={
            <div className="sheet-stats" aria-label="Resumo do painel">
              <article className="sheet-stat">
                <strong>{data.statistics.totalAis}</strong>
                <span>AIS</span>
              </article>
              <article className="sheet-stat">
                <strong>{data.statistics.totalMunicipalities}</strong>
                <span>Municípios</span>
              </article>
              <article className="sheet-stat">
                <strong>{data.pmUnits.length}</strong>
                <span>Sedes PM</span>
              </article>
            </div>
          }
          onTabChange={(tabId) => setMobileActiveTab(tabId as MobileSheetTab)}
        >
          {mobileSheetContent}
        </BottomSheet>
      ) : null}

      <GuidedHelp isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
