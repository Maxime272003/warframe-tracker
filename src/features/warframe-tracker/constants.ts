import localMarketSlugsText from '../../../api_doc/warframe_market_slugs.txt?raw';

export const STORAGE_KEYS = {
  itemsCatalog: 'wf_items_catalog_v8',
  itemsCatalogTimestamp: 'wf_items_catalog_ts_v8',
  hideOwned: 'wf_hide_owned_v1',
  hideUnobtainable: 'wf_hide_unobtainable_v1',
  showFiltersBar: 'wf_show_filters_bar_v1',
  filter: 'wf_item_filter_v1',
  ownedItems: 'wf_owned_items_v1',
  unobtainableItems: 'wf_unobtainable_items_v1',
  priorityItems: 'wf_priority_items_v1',
  selectedCategory: 'wf_selected_category_v1',
  marketSlugs: 'wf_market_slugs_cache_v1',
  marketSlugsTimestamp: 'wf_market_slugs_cache_ts_v1',
  activeView: 'wf_active_view_v1',
  lichDiscoveredMurmurSlots: 'wf_lich_discovered_slots_v1',
  lichSolverStateId: 'wf_lich_solver_state_v1',
  lichSolverAttemptCount: 'wf_lich_attempt_count_v1',
  lichSolverHistory: 'wf_lich_history_v1',
} as const;

export const MARKET_SLUG_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
export const ITEMS_CATALOG_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

export const EXCLUDED_ITEMS = new Set(['Helminth']);

export const ITEM_FILTER_OPTIONS = [
  { value: 'All', label: 'All (A-Z)' },
  { value: 'Standard', label: 'Standard' },
  { value: 'Prime', label: 'Prime' },
  { value: 'Kuva', label: 'Kuva' },
  { value: 'Tenet', label: 'Tenet' },
  { value: 'Coda', label: 'Coda' },
] as const;

export const bundledMarketSlugsText = localMarketSlugsText;

export const REQUIEM_MOD_IDS = [
  'fass',
  'khra',
  'jahu',
  'netra',
  'lohk',
  'ris',
  'vome',
  'xata',
  'oull',
] as const;