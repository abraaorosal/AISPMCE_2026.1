const PM_UNIT_CATEGORY_LABELS: Record<string, string> = {
  comandos: 'Comando',
  batalhoes: 'Batalhão',
  bases_raio: 'Base RAIO',
  unidades_especializadas: 'Unidade especializada',
};

const PM_UNIT_CATEGORY_COLORS: Record<string, string> = {
  comandos: '#0a9b45',
  batalhoes: '#0c6b52',
  bases_raio: '#6b54c8',
  unidades_especializadas: '#ef8b17',
};

function humanizeCategoryKey(categoryKey: string) {
  return categoryKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function getPMUnitCategoryLabel(categoryKey: string) {
  return PM_UNIT_CATEGORY_LABELS[categoryKey] ?? humanizeCategoryKey(categoryKey);
}

export function getPMUnitCategoryColor(categoryKey: string) {
  return PM_UNIT_CATEGORY_COLORS[categoryKey] ?? '#138f63';
}
