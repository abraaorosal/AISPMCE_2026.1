import { SUBMUNICIPAL_LAYER_PATHS } from '@/config/territorial';
import type {
  AISSourceFile,
  MunicipalityGeoCollection,
  NeighborhoodGeoCollection,
  PMUnitSourceFile,
  RaioBaseSourceFile,
} from '@/types';

export const DATA_SOURCE_PATHS = {
  ais: '/data/ais-ceara.json',
  municipalities: '/data/ceara-municipios.geojson',
  pmUnits: '/data/sedes-pm.json',
  raioBases: '/data/municipios-base-raio-coordenadas.json',
} as const;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path} (${response.status})`);
  }

  return (await response.json()) as T;
}

async function fetchOptionalJson<T>(path: string): Promise<T | null> {
  const response = await fetch(path);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path} (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function loadRawSources() {
  const [
    aisSource,
    municipalitiesSource,
    pmUnitsSource,
    raioBasesSource,
    fortalezaNeighborhoodsSource,
    caucaiaTerritorialUnitsSource,
  ] = await Promise.all([
    fetchJson<AISSourceFile>(DATA_SOURCE_PATHS.ais),
    fetchJson<MunicipalityGeoCollection>(DATA_SOURCE_PATHS.municipalities),
    fetchJson<PMUnitSourceFile>(DATA_SOURCE_PATHS.pmUnits),
    fetchJson<RaioBaseSourceFile>(DATA_SOURCE_PATHS.raioBases),
    fetchOptionalJson<NeighborhoodGeoCollection>(SUBMUNICIPAL_LAYER_PATHS.fortalezaNeighborhoods),
    fetchOptionalJson<NeighborhoodGeoCollection>(SUBMUNICIPAL_LAYER_PATHS.caucaiaTerritorialUnits),
  ]);

  return {
    aisSource,
    municipalitiesSource,
    fortalezaNeighborhoodsSource,
    caucaiaTerritorialUnitsSource,
    pmUnitsSource,
    raioBasesSource,
  };
}
