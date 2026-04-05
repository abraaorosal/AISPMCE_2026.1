import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import type { Feature } from 'geojson';
import type { PathOptions } from 'leaflet';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Pane,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import cpraioLogo from '@/assets/branding/logo-cpraio.jpeg';
import pmceLogo from '@/assets/branding/logo-pmce.png';
import {
  FALLBACK_CENTER,
  FALLBACK_ZOOM,
  MAP_FOCUS_PADDING,
  TILE_ATTRIBUTION,
  TILE_LAYERS,
} from '@/config/map';
import { FloatingStats } from '@/components/FloatingStats';
import { formatDecimal } from '@/utils/format';
import type {
  AISArea,
  MapBounds,
  MappedMunicipality,
  PMUnit,
  TerritorialUnit,
  TerritoryStatistics,
  ThemeMode,
} from '@/types';

interface MapNavigatorProps {
  focusBounds: MapBounds | null;
  focusKey: string;
  focusMode: 'overview' | 'ais' | 'municipality' | 'unit' | 'pm-unit';
  mapBounds: MapBounds;
  resetSequence: number;
}

interface MapViewProps {
  areas: AISArea[];
  focusBounds: MapBounds | null;
  focusKey: string;
  focusMode: 'overview' | 'ais' | 'municipality' | 'unit' | 'pm-unit';
  focusSummary: {
    eyebrow: string;
    title: string;
    description: string;
  };
  mapBounds: MapBounds;
  municipalities: MappedMunicipality[];
  pmUnits: PMUnit[];
  territorialUnits: TerritorialUnit[];
  resetSequence: number;
  selectedAisId: string | null;
  selectedBattalionId: string | null;
  selectedRaioBaseId: string | null;
  selectedMunicipalityId: string | null;
  selectedTerritorialUnitId: string | null;
  statistics: TerritoryStatistics;
  theme: ThemeMode;
  onSelectBattalion: (battalion: PMUnit) => void;
  onSelectRaioBase: (raioBase: PMUnit) => void;
  onSelectMunicipality: (municipality: MappedMunicipality) => void;
  onSelectTerritorialUnit: (unit: TerritorialUnit) => void;
}

interface FocusLabel {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  tone: 'municipality' | 'unit';
}

function municipalityPopupLabel(municipality: MappedMunicipality) {
  if (municipality.aisId) {
    return municipality.aisId;
  }

  return municipality.coverageStatus === 'submunicipal'
    ? 'Dividido entre varias AIS'
    : 'Area urbana detalhada';
}

function territorialUnitPopupLabel(unit: TerritorialUnit) {
  return unit.aisId ?? 'Area urbana detalhada';
}

function municipalityTooltipBadge(municipality: MappedMunicipality) {
  if (municipality.aisId) {
    return municipality.aisId;
  }

  return municipality.coverageStatus === 'submunicipal' ? 'Multiplas AIS' : 'Cobertura urbana';
}

function territorialUnitTooltipBadge(unit: TerritorialUnit) {
  return unit.aisId ?? 'Cobertura urbana';
}

function pmUnitTooltipBadge(unit: PMUnit) {
  return unit.shortName;
}

function hashLabelSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getOperationalIconOffset(unit: PMUnit, mapZoom: number): [number, number] {
  const seed = hashLabelSeed(unit.id);
  const spread = mapZoom >= 9 ? 4 : mapZoom >= 8 ? 6 : 8;
  const clusterX = ((seed % 3) - 1) * spread;
  const clusterY = ((Math.floor(seed / 3) % 3) - 1) * spread;
  const categoryOffset =
    unit.categoryKey === 'batalhoes'
      ? ([-11, -10] as const)
      : unit.categoryKey === 'bases_raio'
        ? ([11, 10] as const)
        : ([0, 0] as const);

  return [categoryOffset[0] + clusterX, categoryOffset[1] + clusterY];
}

function areaOverlayStyle(
  area: AISArea,
  selectedAisId: string | null,
  theme: ThemeMode,
): PathOptions {
  const isSelected = selectedAisId === area.id;
  const isMuted = Boolean(selectedAisId) && !isSelected;
  const isLight = theme === 'light';

  return {
    stroke: false,
    fillColor: area.color,
    fillOpacity: isMuted ? 0.015 : isSelected ? (isLight ? 0.24 : 0.18) : isLight ? 0.055 : 0.03,
  };
}

function areaBoundaryStyle(
  area: AISArea,
  selectedAisId: string | null,
  theme: ThemeMode,
): PathOptions {
  const isSelected = selectedAisId === area.id;
  const isMuted = Boolean(selectedAisId) && !isSelected;
  const isLight = theme === 'light';

  return {
    interactive: false,
    color: isSelected ? '#ffb057' : isLight ? '#113524' : '#d9f6df',
    weight: isSelected ? (isLight ? 5.8 : 5) : isLight ? 2.45 : 2.1,
    opacity: isMuted ? (isLight ? 0.14 : 0.1) : isSelected ? 1 : isLight ? 0.7 : 0.42,
    fill: false,
    lineCap: 'round',
    lineJoin: 'round',
  };
}

function areaHaloStyle(
  area: AISArea,
  selectedAisId: string | null,
  theme: ThemeMode,
): PathOptions {
  if (selectedAisId !== area.id) {
    return {
      stroke: false,
      fill: false,
    };
  }

  const isLight = theme === 'light';

  return {
    interactive: false,
    className: 'ais-halo-path',
    color: isLight ? '#ffd38a' : '#ffcf78',
    weight: isLight ? 10 : 9,
    opacity: isLight ? 0.5 : 0.34,
    fill: false,
    lineCap: 'round',
    lineJoin: 'round',
  };
}

function territorialUnitStyle(
  unit: TerritorialUnit,
  hoveredUnitId: string | null,
  selectedAisId: string | null,
  selectedMunicipalityId: string | null,
  selectedTerritorialUnitId: string | null,
  theme: ThemeMode,
): PathOptions {
  const isSelectedUnit = unit.id === selectedTerritorialUnitId;
  const isHovered = unit.id === hoveredUnitId;
  const isSelectedMunicipality = unit.municipalityId === selectedMunicipalityId;
  const isSelectedAis = Boolean(selectedAisId) && unit.aisId === selectedAisId;
  const isMutedByMunicipality =
    Boolean(selectedMunicipalityId) && unit.municipalityId !== selectedMunicipalityId;
  const isMutedByFilter = Boolean(selectedAisId) && unit.aisId !== selectedAisId;
  const isLight = theme === 'light';

  return {
    color: unit.aisColor,
    weight: isSelectedUnit ? (isLight ? 3.2 : 2.9) : isHovered ? (isLight ? 2.6 : 2.2) : isSelectedMunicipality ? (isLight ? 2.15 : 1.82) : isLight ? 1.62 : 1.18,
    opacity:
      isMutedByMunicipality || isMutedByFilter
        ? isLight
          ? 0.08
          : 0.12
        : unit.coverageStatus === 'mapped'
          ? isLight
            ? 1
            : 0.92
          : isLight
            ? 0.62
            : 0.42,
    fillColor: unit.aisColor,
    fillOpacity: isSelectedUnit
      ? isLight ? 0.86 : 0.82
      : isHovered
        ? isLight ? 0.7 : 0.58
        : isSelectedAis
          ? isLight ? 0.6 : 0.52
          : isSelectedMunicipality
            ? isLight ? 0.58 : 0.5
            : isMutedByMunicipality || isMutedByFilter
              ? 0.05
              : unit.coverageStatus === 'mapped'
                ? isLight ? 0.28 : 0.22
                : isLight ? 0.16 : 0.1,
    dashArray: unit.coverageStatus === 'mapped' ? undefined : '5 5',
    lineCap: 'round',
    lineJoin: 'round',
  };
}

function markerStyle(
  municipality: MappedMunicipality,
  selectedAisId: string | null,
  selectedMunicipalityId: string | null,
  theme: ThemeMode,
) {
  const isSelectedMunicipality = municipality.id === selectedMunicipalityId;
  const isMutedByMunicipality =
    Boolean(selectedMunicipalityId) && municipality.id !== selectedMunicipalityId;
  const isMutedByFilter =
    Boolean(selectedAisId) &&
    municipality.aisId !== selectedAisId &&
    municipality.coverageStatus !== 'submunicipal';
  const isLight = theme === 'light';

  return {
    radius: isSelectedMunicipality ? 8.4 : isMutedByMunicipality || isMutedByFilter ? 4.2 : isLight ? 5.8 : 5.1,
    pathOptions: {
      color: '#ffffff',
      weight: isSelectedMunicipality ? 2.4 : isLight ? 1.4 : 1.1,
      fillColor: municipality.aisColor,
      fillOpacity: isMutedByMunicipality || isMutedByFilter ? 0.16 : isLight ? 1 : 0.94,
    },
  };
}

function pmUnitMarkerStyle(
  unit: PMUnit,
  selectedAisId: string | null,
  selectedMunicipalityId: string | null,
  theme: ThemeMode,
) {
  const isMunicipalityMatch = Boolean(selectedMunicipalityId) && unit.municipalityId === selectedMunicipalityId;
  const isAisMatch = !selectedMunicipalityId && Boolean(selectedAisId) && unit.aisId === selectedAisId;
  const isMuted =
    (Boolean(selectedMunicipalityId) && unit.municipalityId !== selectedMunicipalityId) ||
    (!selectedMunicipalityId && Boolean(selectedAisId) && unit.aisId !== selectedAisId);
  const isHighlighted = isMunicipalityMatch || isAisMatch;
  const isLight = theme === 'light';

  return {
    radius: isHighlighted ? 8.6 : isMuted ? 4.8 : isLight ? 6.3 : 5.9,
    pathOptions: {
      color: isLight ? '#0b2216' : '#f3fff5',
      weight: isHighlighted ? 2.5 : 1.7,
      fillColor: unit.categoryColor,
      fillOpacity: isMuted ? 0.24 : 0.98,
    },
  };
}

function getFocusDuration(focusMode: MapNavigatorProps['focusMode']) {
  switch (focusMode) {
    case 'pm-unit':
      return 0.24;
    case 'unit':
      return 0.22;
    case 'municipality':
      return 0.26;
    case 'ais':
      return 0.38;
    default:
      return 0.32;
  }
}

function getOperationalIconSize(mapZoom: number, isSelected: boolean, isHighlighted: boolean) {
  if (isSelected) {
    return mapZoom >= 9 ? 22 : 19;
  }

  if (isHighlighted) {
    return mapZoom >= 9 ? 19 : 17;
  }

  return mapZoom >= 9 ? 16 : mapZoom >= 8 ? 14 : 12;
}

function MapZoomTracker({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

function MapNavigator({
  focusBounds,
  focusKey,
  focusMode,
  mapBounds,
  resetSequence,
}: MapNavigatorProps) {
  const map = useMap();

  useEffect(() => {
    if (!focusBounds) {
      return;
    }

    map.stop();
    map.fitBounds(focusBounds, {
      animate: true,
      duration: getFocusDuration(focusMode),
      padding: MAP_FOCUS_PADDING,
    });
  }, [focusBounds, focusKey, focusMode, map]);

  useEffect(() => {
    map.stop();
    map.fitBounds(mapBounds, {
      animate: true,
      duration: 0.34,
      padding: MAP_FOCUS_PADDING,
    });
  }, [map, mapBounds, resetSequence]);

  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  return null;
}

export function MapView({
  areas,
  focusBounds,
  focusKey,
  focusMode,
  focusSummary,
  mapBounds,
  municipalities,
  pmUnits,
  territorialUnits,
  resetSequence,
  selectedAisId,
  selectedBattalionId,
  selectedRaioBaseId,
  selectedMunicipalityId,
  selectedTerritorialUnitId,
  statistics,
  theme,
  onSelectBattalion,
  onSelectRaioBase,
  onSelectMunicipality,
  onSelectTerritorialUnit,
}: MapViewProps) {
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(FALLBACK_ZOOM);
  const selectedMunicipality = useMemo(
    () => municipalities.find((municipality) => municipality.id === selectedMunicipalityId) ?? null,
    [municipalities, selectedMunicipalityId],
  );
  const selectedArea = useMemo(
    () => areas.find((area) => area.id === selectedAisId) ?? null,
    [areas, selectedAisId],
  );
  const battalionUnits = useMemo(
    () => pmUnits.filter((unit) => unit.categoryKey === 'batalhoes'),
    [pmUnits],
  );
  const raioBaseUnits = useMemo(
    () => pmUnits.filter((unit) => unit.categoryKey === 'bases_raio'),
    [pmUnits],
  );
  const supportPmUnits = useMemo(
    () =>
      pmUnits.filter(
        (unit) => unit.categoryKey !== 'batalhoes' && unit.categoryKey !== 'bases_raio',
      ),
    [pmUnits],
  );
  const focusLabels = useMemo<FocusLabel[]>(() => {
    if (!selectedMunicipality) {
      return [];
    }

    if (selectedMunicipality.coverageStatus === 'submunicipal') {
      return territorialUnits
        .filter(
          (unit) =>
            unit.municipalityId === selectedMunicipality.id && unit.unitType === 'submunicipal',
        )
        .sort((left, right) => left.unitName.localeCompare(right.unitName, 'pt-BR'))
        .map((unit) => ({
          id: `focus-unit:${unit.id}`,
          latitude: unit.latitude,
          longitude: unit.longitude,
          name: unit.unitName,
          tone: 'unit',
        }));
    }

    if (selectedArea?.scope === 'submunicipal') {
      const unitsWithinMunicipality = selectedArea.territorialUnits
        .filter(
          (unit) =>
            unit.municipalityId === selectedMunicipality.id && unit.unitType === 'submunicipal',
        )
        .sort((left, right) => left.unitName.localeCompare(right.unitName, 'pt-BR'))
        .map((unit) => ({
          id: `focus-unit:${unit.id}`,
          latitude: unit.latitude,
          longitude: unit.longitude,
          name: unit.unitName,
          tone: 'unit' as const,
        }));

      if (unitsWithinMunicipality.length) {
        return unitsWithinMunicipality;
      }
    }

    if (!selectedArea) {
      return [
        {
          id: `focus-municipality:${selectedMunicipality.id}`,
          latitude: selectedMunicipality.latitude,
          longitude: selectedMunicipality.longitude,
          name: selectedMunicipality.name,
          tone: 'municipality',
        },
      ];
    }

    return selectedArea.municipalities
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
      .map((municipality) => ({
        id: `focus-municipality:${municipality.id}`,
        latitude: municipality.latitude,
        longitude: municipality.longitude,
        name: municipality.name,
        tone: 'municipality',
      }));
  }, [areas, municipalities, selectedArea, selectedMunicipality, territorialUnits]);

  return (
    <section className="map-card">
      <div className="map-card__overlay">
        <article className="map-focus-card">
          <span className="caption">{focusSummary.eyebrow}</span>
          <strong>{focusSummary.title}</strong>
          <p>{focusSummary.description}</p>
        </article>

        <FloatingStats statistics={statistics} />
      </div>

      <MapContainer
        bounds={mapBounds}
        center={FALLBACK_CENTER}
        className="leaflet-map"
        tap
        zoom={FALLBACK_ZOOM}
        zoomControl={false}
      >
        <MapNavigator
          focusBounds={focusBounds}
          focusKey={focusKey}
          focusMode={focusMode}
          mapBounds={mapBounds}
          resetSequence={resetSequence}
        />
        <MapResizeHandler />
        <MapZoomTracker onZoomChange={setMapZoom} />

        <TileLayer attribution={TILE_ATTRIBUTION} opacity={theme === 'light' ? 0.56 : 0.62} url={TILE_LAYERS[theme]} />
        <ZoomControl position="bottomright" />
        <Pane name="label-tooltips" style={{ zIndex: 640 }} />
        <Pane name="focus-labels" style={{ zIndex: 630 }} />

        <Pane name="ais-overlays" style={{ zIndex: 260 }}>
          {areas.map((area) => {
            if (!area.aggregatedGeometry) {
              return null;
            }

            return (
              <GeoJSON
                key={`overlay-${area.id}`}
                data={
                  {
                    type: 'Feature',
                    geometry: area.aggregatedGeometry,
                    properties: {
                      id: area.id,
                    },
                  } as Feature
                }
                style={areaOverlayStyle(area, selectedAisId, theme)}
              />
            );
          })}
        </Pane>

        <Pane name="ais-halo" style={{ zIndex: 300 }}>
          {areas.map((area) => {
            if (!area.aggregatedGeometry || selectedAisId !== area.id) {
              return null;
            }

            return (
              <GeoJSON
                key={`halo-${area.id}`}
                data={
                  {
                    type: 'Feature',
                    geometry: area.aggregatedGeometry,
                    properties: {
                      id: area.id,
                    },
                  } as Feature
                }
                style={areaHaloStyle(area, selectedAisId, theme)}
              />
            );
          })}
        </Pane>

        <Pane name="ais-boundaries" style={{ zIndex: 350 }}>
          {areas.map((area) => {
            if (!area.aggregatedGeometry) {
              return null;
            }

            return (
              <GeoJSON
                key={`boundary-${area.id}`}
                data={
                  {
                    type: 'Feature',
                    geometry: area.aggregatedGeometry,
                    properties: {
                      id: area.id,
                    },
                  } as Feature
                }
                style={areaBoundaryStyle(area, selectedAisId, theme)}
              />
            );
          })}
        </Pane>

        <Pane name="territorial-units" style={{ zIndex: 320 }}>
          {territorialUnits.map((unit) => (
            <GeoJSON
              key={unit.id}
              data={
                {
                  type: 'Feature',
                  geometry: unit.geometry,
                  properties: {
                    id: unit.id,
                  },
                } as Feature
              }
              style={territorialUnitStyle(
                unit,
                hoveredUnitId,
                selectedAisId,
                selectedMunicipalityId,
                selectedTerritorialUnitId,
                theme,
              )}
              eventHandlers={{
                click: () => onSelectTerritorialUnit(unit),
                mouseover: () => setHoveredUnitId(unit.id),
                mouseout: () =>
                  setHoveredUnitId((currentHoveredUnitId) =>
                    currentHoveredUnitId === unit.id ? null : currentHoveredUnitId,
                  ),
              }}
            >
              <Tooltip
                className="map-label-tooltip map-label-tooltip--unit"
                direction="top"
                offset={[0, -8]}
                opacity={1}
                pane="label-tooltips"
                sticky
              >
                <div className="map-label">
                  <strong>{unit.unitName}</strong>
                  <span className="map-label__badge">{territorialUnitTooltipBadge(unit)}</span>
                </div>
              </Tooltip>
              <Popup>
                <div className="popup-card">
                  <span className="caption">
                    {unit.unitType === 'submunicipal' ? 'Área interna' : 'Município'}
                  </span>
                  <strong>{unit.unitName}</strong>
                  <p>
                    {unit.municipalityName} • {territorialUnitPopupLabel(unit)}
                  </p>
                  <dl>
                    <div>
                      <dt>Latitude</dt>
                      <dd>{formatDecimal(unit.latitude)}</dd>
                    </div>
                    <div>
                      <dt>Longitude</dt>
                      <dd>{formatDecimal(unit.longitude)}</dd>
                    </div>
                  </dl>
                  {unit.popupNote ? <small>{unit.popupNote}</small> : null}
                </div>
              </Popup>
            </GeoJSON>
          ))}
        </Pane>

        <Pane name="municipality-centroids" style={{ zIndex: 420 }}>
          {municipalities.map((municipality) => {
            const markerAppearance = markerStyle(
              municipality,
              selectedAisId,
              selectedMunicipalityId,
              theme,
            );

            return (
              <CircleMarker
                key={`marker-${municipality.id}`}
                center={[municipality.latitude, municipality.longitude]}
                eventHandlers={{
                  click: () => onSelectMunicipality(municipality),
                }}
                pathOptions={markerAppearance.pathOptions}
                radius={markerAppearance.radius}
              >
                <Tooltip
                  className="map-label-tooltip map-label-tooltip--municipality"
                  direction="right"
                  offset={[14, 0]}
                  opacity={1}
                  pane="label-tooltips"
                >
                  <div className="map-label">
                    <strong>{municipality.name}</strong>
                    <span className="map-label__badge">
                      {municipalityTooltipBadge(municipality)}
                    </span>
                  </div>
                </Tooltip>
                <Popup>
                  <div className="popup-card">
                    <span className="caption">Municipio</span>
                    <strong>{municipality.name}</strong>
                    <p>{municipalityPopupLabel(municipality)}</p>
                    <dl>
                      <div>
                        <dt>Latitude</dt>
                        <dd>{formatDecimal(municipality.latitude)}</dd>
                      </div>
                      <div>
                        <dt>Longitude</dt>
                        <dd>{formatDecimal(municipality.longitude)}</dd>
                      </div>
                    </dl>
                    {municipality.popupNote ? <small>{municipality.popupNote}</small> : null}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </Pane>

        <Pane name="pm-units" style={{ zIndex: 520 }}>
          {supportPmUnits.map((unit) => {
            const markerAppearance = pmUnitMarkerStyle(
              unit,
              selectedAisId,
              selectedMunicipalityId,
              theme,
            );
            const shouldShowPermanentLabel =
              (Boolean(selectedMunicipalityId) && unit.municipalityId === selectedMunicipalityId) ||
              (!selectedMunicipalityId && Boolean(selectedAisId) && unit.aisId === selectedAisId);

            return (
              <CircleMarker
                key={`pm-unit-${unit.id}`}
                center={[unit.latitude, unit.longitude]}
                pathOptions={markerAppearance.pathOptions}
                radius={markerAppearance.radius}
              >
                <Tooltip
                  className="map-label-tooltip map-label-tooltip--pm-unit"
                  direction="top"
                  offset={[0, -12]}
                  opacity={1}
                  pane="label-tooltips"
                  permanent={shouldShowPermanentLabel}
                >
                  <div className="map-label map-label--pm-unit">
                    <span className="map-label__eyebrow">{unit.categoryLabel}</span>
                    <strong>{pmUnitTooltipBadge(unit)}</strong>
                    <small>{unit.name}</small>
                  </div>
                </Tooltip>
                <Popup>
                  <div className="popup-card popup-card--pm-unit">
                    <span className="caption">{unit.categoryLabel}</span>
                    <strong>{unit.name}</strong>
                    <p>
                      {unit.shortName}
                      {unit.aisId ? ` • ${unit.aisId}` : ''}
                    </p>
                    <dl>
                      <div>
                        <dt>Município-sede</dt>
                        <dd>{unit.municipalityName ?? 'Não informado'}</dd>
                      </div>
                      <div>
                        <dt>Endereço</dt>
                        <dd>{unit.address ?? 'Não informado'}</dd>
                      </div>
                      <div>
                        <dt>Telefone</dt>
                        <dd>{unit.phone ?? 'Não informado'}</dd>
                      </div>
                      <div>
                        <dt>E-mail</dt>
                        <dd>{unit.email ?? 'Não informado'}</dd>
                      </div>
                    </dl>
                    <small>{unit.locationNote}</small>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </Pane>

        <Pane name="battalion-units" style={{ zIndex: 560 }}>
          {battalionUnits.map((unit) => {
            const isSelected = selectedBattalionId === unit.id;
            const isMunicipalityMatch =
              Boolean(selectedMunicipalityId) && unit.municipalityId === selectedMunicipalityId;
            const isAisMatch =
              !selectedMunicipalityId && Boolean(selectedAisId) && unit.aisId === selectedAisId;
            const isHighlighted = isSelected || isMunicipalityMatch || isAisMatch;
            const isMuted =
              (Boolean(selectedMunicipalityId) && unit.municipalityId !== selectedMunicipalityId) ||
              (!selectedMunicipalityId && Boolean(selectedAisId) && unit.aisId !== selectedAisId);
            const iconSize = getOperationalIconSize(mapZoom, isSelected, isHighlighted);
            const iconOffset = getOperationalIconOffset(unit, mapZoom);
            const shouldShowPermanentLabel =
              isSelected ||
              (Boolean(selectedMunicipalityId) && unit.municipalityId === selectedMunicipalityId) ||
              (!selectedMunicipalityId && Boolean(selectedAisId) && unit.aisId === selectedAisId);

            return (
              <CircleMarker
                key={`battalion-${unit.id}`}
                center={[unit.latitude, unit.longitude]}
                eventHandlers={{
                  click: () => onSelectBattalion(unit),
                }}
                pathOptions={{
                  color: 'transparent',
                  weight: 0,
                  fillColor: 'transparent',
                  fillOpacity: 0,
                  opacity: 0,
                }}
                radius={Math.max(iconSize * 0.56, 6)}
              >
                <Tooltip
                  className={
                    shouldShowPermanentLabel
                      ? 'map-label-tooltip map-label-tooltip--pm-unit map-label-tooltip--battalion'
                      : 'map-icon-tooltip map-icon-tooltip--battalion'
                  }
                  direction={shouldShowPermanentLabel ? 'top' : 'center'}
                  offset={shouldShowPermanentLabel ? [0, -12] : iconOffset}
                  opacity={1}
                  pane="label-tooltips"
                  permanent
                >
                  {shouldShowPermanentLabel ? (
                    <div className="map-label map-label--pm-unit map-label--battalion">
                      <span className="map-label__eyebrow">Batalhão</span>
                      <strong>{unit.shortName}</strong>
                      <small>
                        {unit.municipalityName ?? 'Município não informado'}
                        {unit.aisId ? ` • ${unit.aisId}` : ''}
                      </small>
                    </div>
                  ) : (
                    <div
                      className={[
                        'map-icon-marker',
                        'map-icon-marker--battalion',
                        isSelected || isHighlighted ? 'is-highlighted' : '',
                        isMuted ? 'is-muted' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ '--marker-size': `${iconSize}px` } as CSSProperties}
                    >
                      <img src={pmceLogo} alt={unit.shortName} />
                    </div>
                  )}
                </Tooltip>
                <Popup>
                  <div className="popup-card popup-card--pm-unit popup-card--battalion">
                    <span className="caption">Batalhão</span>
                    <strong>{unit.shortName}</strong>
                    {unit.name !== unit.shortName ? <p>{unit.name}</p> : null}
                    <dl>
                      <div>
                        <dt>AIS</dt>
                        <dd>{unit.aisId ?? 'Não informada'}</dd>
                      </div>
                      <div>
                        <dt>Município-sede</dt>
                        <dd>{unit.municipalityName ?? 'Não informado'}</dd>
                      </div>
                      <div>
                        <dt>Endereço</dt>
                        <dd>{unit.address ?? 'Não informado'}</dd>
                      </div>
                      <div>
                        <dt>Telefone</dt>
                        <dd>{unit.phone ?? 'Não informado'}</dd>
                      </div>
                      <div>
                        <dt>E-mail</dt>
                        <dd>{unit.email ?? 'Não informado'}</dd>
                      </div>
                    </dl>
                    <small>{unit.locationNote}</small>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </Pane>

        <Pane name="raio-base-units" style={{ zIndex: 550 }}>
          {raioBaseUnits.map((unit) => {
            const isSelected = selectedRaioBaseId === unit.id;
            const isMunicipalityMatch =
              Boolean(selectedMunicipalityId) && unit.municipalityId === selectedMunicipalityId;
            const isAisMatch =
              !selectedMunicipalityId && Boolean(selectedAisId) && unit.aisId === selectedAisId;
            const isHighlighted = isSelected || isMunicipalityMatch || isAisMatch;
            const isMuted =
              (Boolean(selectedMunicipalityId) && unit.municipalityId !== selectedMunicipalityId) ||
              (!selectedMunicipalityId && Boolean(selectedAisId) && unit.aisId !== selectedAisId);
            const iconSize = getOperationalIconSize(mapZoom, isSelected, isHighlighted);
            const iconOffset = getOperationalIconOffset(unit, mapZoom);
            const shouldShowPermanentLabel =
              isSelected ||
              (Boolean(selectedMunicipalityId) && unit.municipalityId === selectedMunicipalityId) ||
              (!selectedMunicipalityId && Boolean(selectedAisId) && unit.aisId === selectedAisId);

            return (
              <CircleMarker
                key={`raio-base-${unit.id}`}
                center={[unit.latitude, unit.longitude]}
                eventHandlers={{
                  click: () => onSelectRaioBase(unit),
                }}
                pathOptions={{
                  color: 'transparent',
                  weight: 0,
                  fillColor: 'transparent',
                  fillOpacity: 0,
                  opacity: 0,
                }}
                radius={Math.max(iconSize * 0.56, 6)}
              >
                <Tooltip
                  className={
                    shouldShowPermanentLabel
                      ? 'map-label-tooltip map-label-tooltip--pm-unit map-label-tooltip--battalion'
                      : 'map-icon-tooltip map-icon-tooltip--raio'
                  }
                  direction={shouldShowPermanentLabel ? 'top' : 'center'}
                  offset={shouldShowPermanentLabel ? [0, -12] : iconOffset}
                  opacity={1}
                  pane="label-tooltips"
                  permanent
                >
                  {shouldShowPermanentLabel ? (
                    <div className="map-label map-label--pm-unit map-label--battalion">
                      <span className="map-label__eyebrow">Base RAIO</span>
                      <strong>{unit.municipalityName ?? unit.shortName}</strong>
                      <small>
                        {unit.aisId ?? 'Sem AIS'}
                        {unit.strength ? ` • efetivo ${unit.strength}` : ''}
                      </small>
                    </div>
                  ) : (
                    <div
                      className={[
                        'map-icon-marker',
                        'map-icon-marker--raio',
                        isSelected || isHighlighted ? 'is-highlighted' : '',
                        isMuted ? 'is-muted' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ '--marker-size': `${iconSize}px` } as CSSProperties}
                    >
                      <img src={cpraioLogo} alt={unit.shortName} />
                    </div>
                  )}
                </Tooltip>
                <Popup>
                  <div className="popup-card popup-card--pm-unit popup-card--battalion">
                    <span className="caption">Base RAIO</span>
                    <strong>{unit.municipalityName ?? unit.shortName}</strong>
                    <dl>
                      <div>
                        <dt>AIS</dt>
                        <dd>{unit.aisId ?? 'Não informada'}</dd>
                      </div>
                      <div>
                        <dt>Município-sede</dt>
                        <dd>{unit.municipalityName ?? 'Não informado'}</dd>
                      </div>
                      <div>
                        <dt>Efetivo</dt>
                        <dd>{unit.strength ?? 'Não informado'}</dd>
                      </div>
                      <div>
                        <dt>Latitude</dt>
                        <dd>{formatDecimal(unit.latitude)}</dd>
                      </div>
                      <div>
                        <dt>Longitude</dt>
                        <dd>{formatDecimal(unit.longitude)}</dd>
                      </div>
                    </dl>
                    <small>{unit.locationNote}</small>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </Pane>

        <Pane name="focus-labels-markers" style={{ zIndex: 700 }}>
          {focusLabels.map((label) => (
            <CircleMarker
              key={label.id}
              center={[label.latitude, label.longitude]}
              interactive={false}
              pane="focus-labels"
              pathOptions={{
                color: 'transparent',
                fillColor: 'transparent',
                fillOpacity: 0,
                opacity: 0,
                interactive: false,
              }}
              radius={1}
            >
              <Tooltip
                className={
                  label.tone === 'unit'
                    ? 'map-inline-label-tooltip map-inline-label-tooltip--unit'
                    : 'map-inline-label-tooltip map-inline-label-tooltip--municipality'
                }
                direction="center"
                opacity={1}
                pane="focus-labels"
                permanent
              >
                <span className="map-inline-label">{label.name}</span>
              </Tooltip>
            </CircleMarker>
          ))}
        </Pane>
      </MapContainer>
    </section>
  );
}
