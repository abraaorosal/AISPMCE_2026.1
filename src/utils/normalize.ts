const apostrophesRegex = /[’'`´]/g;
const separatorsRegex = /[\-_/.,;:]+/g;
const diacriticsRegex = /[\u0300-\u036f]/g;
const parentheticalRegex = /\([^)]*\)/g;

export function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(diacriticsRegex, '')
    .toLowerCase()
    .replace(apostrophesRegex, '')
    .replace(separatorsRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripParentheticalContent(value: string) {
  return value.replace(parentheticalRegex, ' ');
}

export function normalizeTerritorialName(value: string) {
  return normalizeName(stripParentheticalContent(value));
}

export function compactNormalizedName(value: string) {
  return normalizeTerritorialName(value).replace(/\s+/g, '');
}

export function includesNormalized(haystack: string, needle: string) {
  return normalizeName(haystack).includes(normalizeName(needle));
}
