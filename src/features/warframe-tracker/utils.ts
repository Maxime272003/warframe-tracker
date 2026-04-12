import type { WeaponCatalog, WeaponFilter } from './types';

export function isWeaponCatalog(value: unknown): value is WeaponCatalog {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as WeaponCatalog;
  return (
    typeof data.warframe_weapons === 'object' &&
    data.warframe_weapons !== null &&
    Array.isArray(data.warframe_weapons.primary) &&
    Array.isArray(data.warframe_weapons.secondary) &&
    Array.isArray(data.warframe_weapons.melee)
  );
}

export function parseMarketSlugsText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeWeaponNameForMarket(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '_');
}

export function getMarketSlugCandidates(name: string): string[] {
  const base = normalizeWeaponNameForMarket(name);
  const normalized = base
    .replace(/&/g, 'and')
    .replace(/'/g, '')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return Array.from(new Set([
    `${base}_set`,
    base,
    `${normalized}_set`,
    normalized,
  ]));
}

export function extractMarketItemUrlNames(payload: unknown): string[] {
  const source = payload as {
    data?: unknown[] | { items?: unknown[] };
    items?: unknown[];
    payload?: { items?: unknown[] };
  };

  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(source.data)
      ? source.data
      : Array.isArray(source.items)
        ? source.items
        : Array.isArray(source.payload?.items)
          ? source.payload.items
          : Array.isArray(source.data?.items)
            ? source.data.items
            : [];

  return rawItems
    .map((item) => (item as { slug?: unknown; url_name?: unknown }).slug ?? (item as { slug?: unknown; url_name?: unknown }).url_name)
    .filter((slug): slug is string => typeof slug === 'string')
    .map((slug) => slug.toLowerCase());
}

export function getMarketLinkForWeapon(weapon: string, marketSlugs: Set<string>) {
  const marketCandidates = getMarketSlugCandidates(weapon);
  const baseSlug = normalizeWeaponNameForMarket(weapon);
  const matchedSlug = marketCandidates.find((candidate) => marketSlugs.has(candidate)) ?? null;
  const isKuva = weapon.toLowerCase().includes('kuva');
  const isTenet = weapon.toLowerCase().includes('tenet');
  const isCoda = weapon.toLowerCase().includes('coda');

  if (matchedSlug) {
    return { marketUrl: `https://warframe.market/items/${matchedSlug}?type=sell`, isTradeable: true };
  }

  if (isKuva) {
    return {
      marketUrl: `https://warframe.market/auctions/search?type=lich&weapon_url_name=${baseSlug}`,
      isTradeable: true,
    };
  }

  if (isTenet || isCoda) {
    return {
      marketUrl: `https://warframe.market/auctions/search?type=sister&weapon_url_name=${baseSlug}`,
      isTradeable: true,
    };
  }

  return { marketUrl: `https://warframe.market/items/${baseSlug}?type=sell`, isTradeable: false };
}

export function getWikiUrl(weapon: string): string {
  return `https://wiki.warframe.com/w/${weapon.replace(/ /g, '_')}`;
}

export function getWeaponImageUrl(weapon: string): string {
  return `https://wiki.warframe.com/images/${weapon.replace(/ /g, '')}.png`;
}

export function filterWeaponNames(weapons: string[], filter: WeaponFilter): string[] {
  if (filter === 'Kuva') {
    return weapons.filter((weapon) => weapon.toLowerCase().includes('kuva'));
  }

  if (filter === 'Tenet') {
    return weapons.filter((weapon) => weapon.toLowerCase().includes('tenet'));
  }

  if (filter === 'Coda') {
    return weapons.filter((weapon) => weapon.toLowerCase().includes('coda'));
  }

  if (filter === 'Standard') {
    return weapons.filter((weapon) => {
      const normalized = weapon.toLowerCase();
      return !normalized.includes('kuva') && !normalized.includes('tenet') && !normalized.includes('coda');
    });
  }

  return weapons;
}

export function getRemainingWeaponCount(weapons: string[], ownedWeapons: Set<string>): number {
  return weapons.filter((weapon) => !ownedWeapons.has(weapon)).length;
}