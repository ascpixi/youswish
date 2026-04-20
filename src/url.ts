export function normalizeUrl(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/, '');
}

// Returns the normalized URL plus all ancestor paths, from most to least specific.
// Always includes the full normalized URL. Parent path truncation stops at
// 2 parts (domain + 1 segment) to avoid overly broad bare-domain searches.
export function getSearchVariants(raw: string): string[] {
  const normalized = normalizeUrl(raw);
  if (!normalized) return [];
  const parts = normalized.split('/');
  const variants: string[] = [normalized];
  for (let i = parts.length - 1; i >= 2; i--) {
    variants.push(parts.slice(0, i).join('/'));
  }
  return variants;
}

export type MatchKind = 'exact' | 'ancestor' | 'descendant';

// Returns the kind of path relationship between query and a stored URL, or null if unrelated.
// "ancestor" = stored URL is a child path of query (query is the parent project)
// "descendant" = stored URL is a parent path of query (stored is the parent project)
export function pathMatchKind(query: string, stored: string): MatchKind | null {
  if (!stored) return null;
  const nq = normalizeUrl(query);
  const ns = normalizeUrl(stored);
  if (nq === ns) return 'exact';
  if (ns.startsWith(nq + '/')) return 'ancestor';
  if (nq.startsWith(ns + '/')) return 'descendant';
  return null;
}
