export function formatDecimal(value: number, fractionDigits = 4) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatPercentage(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
