const DEFAULT_API_BASE_URL = 'http://localhost:8001';
const LEGACY_API_BASE_URL = 'http://localhost:8000';

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, '');
}

function buildApiCandidates(configuredUrl?: string) {
  const candidates = [
    configuredUrl,
    DEFAULT_API_BASE_URL,
    LEGACY_API_BASE_URL
  ].filter(Boolean) as string[];

  return Array.from(new Set(candidates.map(normalizeBaseUrl)));
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL);
export const BRAND_AUTOCOMPLETE_API_URL = normalizeBaseUrl(
  import.meta.env.VITE_BRAND_AUTOCOMPLETE_API_URL || API_BASE_URL
);

async function fetchWithFallback(path: string, init: RequestInit | undefined, candidates: string[]) {
  let lastError: unknown = null;

  for (const baseUrl of candidates) {
    try {
      return await fetch(`${baseUrl}${path}`, init);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Failed to reach API for ${path}`);
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetchWithFallback(path, init, buildApiCandidates(import.meta.env.VITE_API_URL));
}

export function autocompleteApiFetch(path: string, init?: RequestInit) {
  return fetchWithFallback(
    path,
    init,
    buildApiCandidates(import.meta.env.VITE_BRAND_AUTOCOMPLETE_API_URL || import.meta.env.VITE_API_URL)
  );
}
