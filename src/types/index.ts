import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export type ThemeMode = 'light' | 'dark';
export type MappingIssueReason =
  | 'urban_detail_entry'
  | 'missing_municipality_geometry'
  | 'duplicate_municipality_assignment'
  | 'duplicate_territorial_assignment';
export type MunicipalityCoverageStatus = 'mapped' | 'submunicipal' | 'urban-detail-unassigned';
export type AreaScope = 'municipal' | 'submunicipal' | 'urban-detail';
export type TerritorialUnitType = 'municipality' | 'submunicipal';
export type PMUnitLocationSource = 'exact' | 'municipality_centroid';
export type PMUnitIssueReason = 'missing_municipality_reference' | 'missing_municipality_match';
export type MapBounds = [[number, number], [number, number]];

export interface AISRecord {
  ais: string;
  municipios_ou_bairros: string[];
}

export interface AISSourceFile {
  area_integrada_de_seguranca: AISRecord[];
}

export interface PMUnitSourceRecord {
  id: string;
  nome: string;
  sigla: string | null;
  municipio_sede: string | null;
  ais: string | null;
  lat: number | null;
  lng: number | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
}

export type PMUnitSourceFile = Record<string, PMUnitSourceRecord[]>;

export interface RaioBaseSourceRecord {
  municipio: string;
  efetivo: number | null;
  latitude: number | null;
  longitude: number | null;
  codarea: string | null;
  id: string | null;
}

export type RaioBaseSourceFile = RaioBaseSourceRecord[];

export interface MunicipalityFeatureProps {
  codarea: string;
  id: string;
  name: string;
  description: string;
}

export type MunicipalityGeometry = Polygon | MultiPolygon;
export type MunicipalityGeoFeature = Feature<MunicipalityGeometry, MunicipalityFeatureProps>;
export type MunicipalityGeoCollection = FeatureCollection<
  MunicipalityGeometry,
  MunicipalityFeatureProps
>;

export interface NeighborhoodFeatureProps {
  id: string;
  name: string;
  municipality: string;
  legislation?: string;
  kind?: string;
  source: string;
}

export type NeighborhoodGeoFeature = Feature<MunicipalityGeometry, NeighborhoodFeatureProps>;
export type NeighborhoodGeoCollection = FeatureCollection<
  MunicipalityGeometry,
  NeighborhoodFeatureProps
>;

export interface MappingInconsistency {
  aisId: string;
  entry: string;
  normalizedEntry: string;
  reason: MappingIssueReason;
  detail: string;
}

export interface MappedMunicipality {
  id: string;
  code: string;
  name: string;
  normalizedName: string;
  aisId: string | null;
  aisColor: string;
  latitude: number;
  longitude: number;
  geometry: MunicipalityGeometry;
  bounds: MapBounds;
  coverageStatus: MunicipalityCoverageStatus;
  popupNote?: string;
  sourceEntry?: string;
}

export interface TerritorialUnit {
  id: string;
  unitName: string;
  normalizedUnitName: string;
  municipalityId: string;
  municipalityName: string;
  municipalityNormalizedName: string;
  unitType: TerritorialUnitType;
  aisId: string | null;
  aisColor: string;
  latitude: number;
  longitude: number;
  geometry: MunicipalityGeometry;
  bounds: MapBounds;
  coverageStatus: MunicipalityCoverageStatus;
  popupNote?: string;
  sourceEntry?: string;
}

export interface AISArea {
  id: string;
  color: string;
  entries: string[];
  normalizedEntries: string[];
  municipalities: MappedMunicipality[];
  territorialUnits: TerritorialUnit[];
  municipalityIds: string[];
  municipalityCount: number;
  unitCount: number;
  unitLabel: string;
  missingEntries: string[];
  missingCount: number;
  exactMatchCount: number;
  totalEntries: number;
  scope: AreaScope;
  coverageLabel: string;
  aggregatedGeometry: MunicipalityGeometry | null;
  bounds: MapBounds | null;
}

export interface RankedAIS {
  aisId: string;
  color: string;
  municipalityCount: number;
  scope: AreaScope;
}

export interface PMUnit {
  id: string;
  name: string;
  shortName: string;
  categoryKey: string;
  categoryLabel: string;
  categoryColor: string;
  municipalityId: string | null;
  municipalityName: string | null;
  municipalityNormalizedName: string | null;
  aisId: string | null;
  aisColor: string;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  email: string | null;
  strength: number | null;
  locationSource: PMUnitLocationSource;
  locationNote: string;
}

export interface PMUnitIssue {
  id: string;
  name: string;
  shortName: string;
  categoryLabel: string;
  municipalityName: string | null;
  aisId: string | null;
  reason: PMUnitIssueReason;
  detail: string;
}

export interface TerritoryStatistics {
  totalAis: number;
  municipalAis: number;
  submunicipalAis: number;
  urbanDetailAis: number;
  mappedMunicipalities: number;
  totalMunicipalities: number;
  unassignedMunicipalities: number;
  inconsistencies: number;
  coveragePercentage: number;
  municipalitiesByAis: RankedAIS[];
  ranking: RankedAIS[];
}

export interface TerritoryDataset {
  areas: AISArea[];
  municipalities: MappedMunicipality[];
  municipalitiesById: Record<string, MappedMunicipality>;
  territorialUnits: TerritorialUnit[];
  territorialUnitsById: Record<string, TerritorialUnit>;
  pmUnits: PMUnit[];
  pmUnitsById: Record<string, PMUnit>;
  pmUnitIssues: PMUnitIssue[];
  statistics: TerritoryStatistics;
  inconsistencies: MappingInconsistency[];
  mapBounds: MapBounds;
}
