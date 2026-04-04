import { useMemo, useState } from 'react';

import cpraioLogo from '@/assets/branding/logo-cpraio.jpeg';
import pmceLogo from '@/assets/branding/logo-pmce.png';
import { ErrorState } from '@/components/ErrorState';
import { GuidedHelp } from '@/components/GuidedHelp';
import { LoadingState } from '@/components/LoadingState';
import { MapView } from '@/components/MapView';
import { Sidebar } from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTerritoryData } from '@/hooks/useTerritoryData';
import { useThemeMode } from '@/hooks/useThemeMode';
import { includesNormalized } from '@/utils/normalize';
import type { MapBounds, MappedMunicipality, PMUnit, TerritorialUnit } from '@/types';

const PM_UNIT_FOCUS_DELTA = 0.045;

function createPointBounds(latitude: number, longitude: number): MapBounds {
  return [
    [latitude - PM_UNIT_FOCUS_DELTA, longitude - PM_UNIT_FOCUS_DELTA],
    [latitude + PM_UNIT_FOCUS_DELTA, longitude + PM_UNIT_FOCUS_DELTA],
  ];
}

export function DashboardPage() {
  const { data, isLoading, error } = useTerritoryData();
  const { theme, toggleTheme } = useThemeMode();
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
      return data.pmUnits.filter((unit) => unit.municipalityId === selectedTerritorialUnit.municipalityId);
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
    selectedRaioBase,
    selectedMunicipality,
    selectedPmUnits.length,
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
      [
        unit.name,
        unit.shortName,
        unit.municipalityName ?? '',
        unit.aisId ?? '',
      ].some((value) => includesNormalized(value, battalionQuery)),
    );
  }, [battalionQuery, data]);

  const raioBaseResults = useMemo(() => {
    if (!data) {
      return [];
    }

    const raioBases = data.pmUnits
      .filter((unit) => unit.categoryKey === 'bases_raio')
      .sort((left, right) => left.municipalityName?.localeCompare(right.municipalityName ?? '', 'pt-BR') ?? 0);

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

  return (
    <div className="app-shell app-shell--persistent">
      <header className="app-masthead">
        <div className="app-masthead__brand">
          <div className="app-masthead__logos">
            <img src={pmceLogo} alt="Polícia Militar do Ceará" />
            <img src={cpraioLogo} alt="CPRAIO" />
          </div>

          <div className="app-masthead__text">
            <span className="eyebrow">Polícia Militar do Ceará • CPRAIO</span>
            <strong>Painel Territorial das Áreas Integradas de Segurança</strong>
            <p>
              Produzido pelo 3º Sgt PM Abraão Henrique - Seção de Estatística e Apoio Operacional /
              CPRAIO
            </p>
          </div>
        </div>
      </header>

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
        onSearchQueryChange={setSearchQuery}
        onSelectAis={handleSelectAis}
        onSelectBattalion={handleSelectBattalion}
        onSelectRaioBase={handleSelectRaioBase}
        onSelectMunicipality={handleSelectMunicipality}
      />

      <main className="dashboard-main">
        <header className="topbar">
          <div className="topbar__title-card">
            <div className="topbar__meta">
              <span className="eyebrow">CPRAIO • PMCE</span>
              <span className="topbar__state">
                {hasActiveSelection ? focusSummary.eyebrow : 'Leitura territorial'}
              </span>
            </div>

            <div className="topbar__title">
              <h1>Mapa das AIS do Ceará</h1>
              <p>
                {hasActiveSelection
                  ? focusSummary.title
                  : 'Selecione uma AIS ou município para focar a leitura do mapa.'}
              </p>
            </div>
          </div>

          <div className="topbar__actions-card">
            <div className="topbar__actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <button className="ghost-button" type="button" onClick={() => setIsHelpOpen(true)}>
              Ajuda
            </button>

            {hasActiveSelection ? (
              <button className="ghost-button" type="button" onClick={handleClearSelection}>
                Limpar
              </button>
            ) : null}

            <button className="primary-button" type="button" onClick={handleResetMap}>
              Centralizar mapa
            </button>
            </div>
          </div>
        </header>

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

      <GuidedHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
