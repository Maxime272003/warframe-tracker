import localMarketSlugsText from '../../../api_doc/warframe_market_slugs.txt?raw';
import type { DisplayCategory } from './types';

export const STORAGE_KEYS = {
  itemsCatalog: 'wf_items_catalog_v5',
  itemsCatalogTimestamp: 'wf_items_catalog_ts_v5',
  hideOwned: 'wf_hide_owned_v1',
  filter: 'wf_item_filter_v1',
  ownedItems: 'wf_owned_items_v1',
  priorityItems: 'wf_priority_items_v1',
  marketSlugs: 'wf_market_slugs_cache_v1',
  marketSlugsTimestamp: 'wf_market_slugs_cache_ts_v1',
} as const;

export const MARKET_SLUG_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
export const ITEMS_CATALOG_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

export const API_TO_DISPLAY_CATEGORY: Record<string, DisplayCategory> = {
  'Arch-Gun': 'Archwings',
  'Arch-Melee': 'Archwings',
  'Archwing': 'Archwings',
  'Pets': 'Companions',
  'Sentinels': 'Companions',
  'Melee': 'Melee',
  'Primary': 'Primary',
  'Secondary': 'Secondary',
  'Warframes': 'Warframes',
};

export const DISPLAY_CATEGORIES: DisplayCategory[] = [
  'Warframes',
  'Primary',
  'Secondary',
  'Melee',
  'Archwings',
  'Companions',
];

export const ITEM_FILTER_OPTIONS = [
  { value: 'All', label: 'All (A-Z)' },
  { value: 'Standard', label: 'Standard' },
  { value: 'Prime', label: 'Prime' },
  { value: 'Kuva', label: 'Kuva' },
  { value: 'Tenet', label: 'Tenet' },
  { value: 'Coda', label: 'Coda' },
] as const;

export const bundledMarketSlugsText = localMarketSlugsText;