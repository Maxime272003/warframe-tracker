import localMarketSlugsText from '../../../api_doc/warframe_market_slugs.txt?raw';

export const STORAGE_KEYS = {
  weaponsCatalog: 'wf_weapons_data',
  hideOwned: 'wf_hide_owned',
  filter: 'wf_weapon_filter',
  ownedWeapons: 'wf_owned_weapons',
  priorityWeapons: 'wf_priority_weapons',
  marketSlugs: 'wf_market_slugs_cache_v1',
  marketSlugsTimestamp: 'wf_market_slugs_cache_ts_v1',
} as const;

export const MARKET_SLUG_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

export const WEAPON_FILTER_OPTIONS = [
  { value: 'All', label: 'Toutes (A-Z)' },
  { value: 'Standard', label: 'Normales (Non-Kuva/Tenet/Coda)' },
  { value: 'Kuva', label: 'Kuva' },
  { value: 'Tenet', label: 'Tenet' },
  { value: 'Coda', label: 'Coda' },
] as const;

export const bundledMarketSlugsText = localMarketSlugsText;