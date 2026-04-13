import { useEffect, useState } from 'react';
import { EXCLUDED_ITEMS, ITEMS_CATALOG_CACHE_TTL_MS, STORAGE_KEYS } from '../constants';
import type { ItemCatalog, ManualCatalogItem } from '../types';

type ApiItem = {
  name?: string;
  category?: string;
  masterable?: boolean;
};

type ManualItemsPayload = ManualCatalogItem[] | { items?: ManualCatalogItem[] };

function readCachedCatalog(): ItemCatalog | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.itemsCatalog);
    const cachedTimestamp = Number(localStorage.getItem(STORAGE_KEYS.itemsCatalogTimestamp) || '0');
    const isFresh = Boolean(cached) && Number.isFinite(cachedTimestamp) && Date.now() - cachedTimestamp < ITEMS_CATALOG_CACHE_TTL_MS;

    if (!isFresh || !cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    return parsed as ItemCatalog;
  } catch {
    return null;
  }
}

function buildCatalogFromApiData(data: ApiItem[]): ItemCatalog {
  const catalog: ItemCatalog = {};

  for (const item of data) {
    if (!item.name || !item.category || item.masterable !== true) {
      continue;
    }

    if (EXCLUDED_ITEMS.has(item.name)) {
      continue;
    }

    // Strip tags like "<ARCHWING> " from names
    const cleanName = item.name.replace(/<[^>]+>\s*/g, '').trim();
    if (!cleanName) {
      continue;
    }

    const category = item.category;
    if (!catalog[category]) {
      catalog[category] = [];
    }

    catalog[category].push(cleanName);
  }

  // Sort each category alphabetically and deduplicate
  for (const category of Object.keys(catalog)) {
    catalog[category] = Array.from(new Set(catalog[category])).sort((a, b) => a.localeCompare(b));
  }

  return catalog;
}

function buildCatalogFromManualData(payload: ManualItemsPayload): ItemCatalog {
  const items = Array.isArray(payload) ? payload : payload.items ?? [];
  const catalog: ItemCatalog = {};

  for (const item of items) {
    if (!item.category || !item.name) {
      continue;
    }

    const category = item.category.trim();
    const cleanName = item.name.replace(/<[^>]+>\s*/g, '').trim();

    if (!category || !cleanName || EXCLUDED_ITEMS.has(cleanName)) {
      continue;
    }

    if (!catalog[category]) {
      catalog[category] = [];
    }

    catalog[category].push(cleanName);
  }

  for (const category of Object.keys(catalog)) {
    catalog[category] = Array.from(new Set(catalog[category])).sort((left, right) => left.localeCompare(right));
  }

  return catalog;
}

function mergeCatalogs(baseCatalog: ItemCatalog, extraCatalog: ItemCatalog): ItemCatalog {
  const merged: ItemCatalog = {};

  for (const [category, items] of Object.entries(baseCatalog)) {
    merged[category] = [...items];
  }

  for (const [category, items] of Object.entries(extraCatalog)) {
    if (!merged[category]) {
      merged[category] = [];
    }

    merged[category].push(...items);
    merged[category] = Array.from(new Set(merged[category])).sort((left, right) => left.localeCompare(right));
  }

  return merged;
}

export function useItemsCatalog(): [ItemCatalog, boolean, string[]] {
  const [catalog, setCatalog] = useState<ItemCatalog>(() => {
    return readCachedCatalog() ?? {};
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const cached = readCachedCatalog() ?? {};
    if (Object.keys(cached).length > 0) {
      setCatalog(cached);
    }

    const fetchCatalog = async () => {
      try {
        const [apiResult, manualResult] = await Promise.allSettled([
          fetch('https://api.warframestat.us/items', {
            signal: controller.signal,
            headers: { 'Accept-Language': 'en' },
          }),
          fetch('/manual-items.json', {
            signal: controller.signal,
          }),
        ]);

        let apiCatalog = cached;
        if (apiResult.status === 'fulfilled' && apiResult.value.ok) {
          const data = (await apiResult.value.json()) as ApiItem[];
          apiCatalog = buildCatalogFromApiData(data);
          localStorage.setItem(STORAGE_KEYS.itemsCatalog, JSON.stringify(apiCatalog));
          localStorage.setItem(STORAGE_KEYS.itemsCatalogTimestamp, String(Date.now()));
        }

        let manualCatalog: ItemCatalog = {};
        if (manualResult.status === 'fulfilled' && manualResult.value.ok) {
          const manualData = (await manualResult.value.json()) as ManualItemsPayload;
          manualCatalog = buildCatalogFromManualData(manualData);
        }

        setCatalog(mergeCatalogs(apiCatalog, manualCatalog));
      } catch {
        // API unavailable — use whatever we have (empty or stale cache)
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCatalog();

    return () => controller.abort();
  }, []);

  // Derive sorted category names
  const categories = Object.keys(catalog).sort((a, b) => a.localeCompare(b));

  return [catalog, isLoading, categories];
}
