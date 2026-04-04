import type { ThemeMode } from '@/types';

export const FALLBACK_CENTER: [number, number] = [-5.2, -39.4];
export const FALLBACK_ZOOM = 7;
export const MAP_FOCUS_PADDING: [number, number] = [28, 28];

export const TILE_LAYERS: Record<ThemeMode, string> = {
  light: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
};

export const TILE_ATTRIBUTION =
  '&copy; OpenStreetMap contributors &copy; CARTO';
