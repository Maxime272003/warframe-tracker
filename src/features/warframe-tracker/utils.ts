import type { DisplayCategory, ItemCatalog, ItemFilter } from './types';
import { EMPTY_ITEM_CATALOG } from './types';
import { DISPLAY_CATEGORIES } from './constants';

export function isItemCatalog(value: unknown): value is ItemCatalog {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;
  return DISPLAY_CATEGORIES.every(
    (category) => Array.isArray(data[category]),
  );
}

export function parseImportJson(value: unknown): ItemCatalog | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const catalog: ItemCatalog = { ...EMPTY_ITEM_CATALOG };
  const keys: Record<string, DisplayCategory> = {
    warframes: 'Warframes',
    primary: 'Primary',
    secondary: 'Secondary',
    melee: 'Melee',
    archwings: 'Archwings',
    companions: 'Companions',
  };

  let hasAnyKey = false;

  for (const [jsonKey, displayCategory] of Object.entries(keys)) {
    if (Array.isArray(data[jsonKey])) {
      catalog[displayCategory] = (data[jsonKey] as unknown[]).filter(
        (item): item is string => typeof item === 'string',
      );
      hasAnyKey = true;
    }
  }

  return hasAnyKey ? catalog : null;
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

export function getMarketLinkForItem(item: string, marketSlugs: Set<string>) {
  const marketCandidates = getMarketSlugCandidates(item);
  const baseSlug = normalizeWeaponNameForMarket(item);
  const matchedSlug = marketCandidates.find((candidate) => marketSlugs.has(candidate)) ?? null;
  const isKuva = item.toLowerCase().includes('kuva');
  const isTenet = item.toLowerCase().includes('tenet');
  const isCoda = item.toLowerCase().includes('coda');

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

export function getWikiUrl(item: string): string {
  return `https://wiki.warframe.com/w/${item.replace(/ /g, '_')}`;
}

const NO_THUMB_WARFRAMES = new Set(['Bonewidow', 'Voidrig']);

export function getItemImageUrl(item: string, category?: string): string {
  const name = item.replace(/[\s-]/g, '');
  if (category === 'Warframes' && !NO_THUMB_WARFRAMES.has(item)) {
    return `https://wiki.warframe.com/images/${name}_Thumb.png`;
  }
  return `https://wiki.warframe.com/images/${name}.png`;
}

export function filterItemNames(items: string[], filter: ItemFilter): string[] {
  if (filter === 'Kuva') {
    return items.filter((item) => item.toLowerCase().includes('kuva'));
  }

  if (filter === 'Tenet') {
    return items.filter((item) => item.toLowerCase().includes('tenet'));
  }

  if (filter === 'Coda') {
    return items.filter((item) => item.toLowerCase().includes('coda'));
  }

  if (filter === 'Prime') {
    return items.filter((item) => item.toLowerCase().includes('prime'));
  }

  if (filter === 'Standard') {
    return items.filter((item) => {
      const normalized = item.toLowerCase();
      return !normalized.includes('kuva')
        && !normalized.includes('tenet')
        && !normalized.includes('coda')
        && !normalized.includes('prime');
    });
  }

  return items;
}

export function getRemainingItemCount(items: string[], ownedItems: Set<string>): number {
  return items.filter((item) => !ownedItems.has(item)).length;
}