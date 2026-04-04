const palette = [
  '#0f5c2e',
  '#14713a',
  '#198646',
  '#1f9c52',
  '#2ab362',
  '#49c27a',
  '#0f6a4e',
  '#118064',
  '#16977a',
  '#1dad8f',
  '#14768b',
  '#188ca3',
  '#1da4bc',
  '#20bbd4',
  '#2f6d95',
  '#3b82ad',
  '#4899c6',
  '#5974b2',
  '#4f6c16',
  '#63851a',
  '#789f1d',
  '#8fba21',
  '#87620f',
  '#a17611',
  '#bb8b14',
  '#d5a015',
  '#9b5010',
  '#b95e12',
  '#d46d15',
  '#f08a1a',
  '#b53e18',
  '#cb4d1d',
  '#df5e25',
  '#9c2f1d',
];

export const AIS_COLORS = Object.freeze(
  Object.fromEntries(
    Array.from({ length: 34 }, (_, index) => {
      const label = `AIS${String(index + 1).padStart(2, '0')}`;
      return [label, palette[index] ?? '#475569'];
    }),
  ) as Record<string, string>,
);

export const URBAN_DETAIL_COLOR = '#667b70';
export const UNASSIGNED_MUNICIPALITY_COLOR = '#93a79d';

export function getAisColor(aisId: string | null) {
  if (!aisId) {
    return UNASSIGNED_MUNICIPALITY_COLOR;
  }

  return AIS_COLORS[aisId] ?? UNASSIGNED_MUNICIPALITY_COLOR;
}
