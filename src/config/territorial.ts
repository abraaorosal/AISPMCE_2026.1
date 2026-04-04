import { resolveAppPath } from '@/utils/paths';

export const SUBMUNICIPAL_LAYER_PATHS = {
  fortalezaNeighborhoods: resolveAppPath('data/fortaleza-bairros.geojson'),
  caucaiaTerritorialUnits: resolveAppPath('data/caucaia-unidades-territoriais.geojson'),
} as const;

export const TERRITORIAL_NAME_ALIASES = Object.freeze({
  'distrito catuana': 'catuana',
  'distrito guararu': 'guararu',
  genibau: 'parque genibau',
});
