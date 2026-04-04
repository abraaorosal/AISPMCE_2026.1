function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function resolveAppPath(relativePath: string) {
  const normalizedBaseUrl = normalizeBaseUrl(import.meta.env.BASE_URL || '/');
  return `${normalizedBaseUrl}${relativePath.replace(/^\/+/, '')}`;
}
