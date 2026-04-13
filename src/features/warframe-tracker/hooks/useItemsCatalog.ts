import { useEffect, useState } from 'react';
import { EXCLUDED_ITEMS, ITEMS_CATALOG_CACHE_TTL_MS, STORAGE_KEYS } from '../constants';
import type { ItemCatalog } from '../types';

type ApiItem = {
  name?: string;
  category?: string;
  masterable?: boolean;
};

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

export function useItemsCatalog(): [ItemCatalog, boolean, string[]] {
  const [catalog, setCatalog] = useState<ItemCatalog>(() => {
    return readCachedCatalog() ?? {};
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = readCachedCatalog();
    if (cached) {
      setCatalog(cached);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchItems = async () => {
      try {
        const response = await fetch('https://api.warframestat.us/items', {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' },
        });

        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const data = (await response.json()) as ApiItem[];
        const newCatalog = buildCatalogFromApiData(data);

        setCatalog(newCatalog);
        localStorage.setItem(STORAGE_KEYS.itemsCatalog, JSON.stringify(newCatalog));
        localStorage.setItem(STORAGE_KEYS.itemsCatalogTimestamp, String(Date.now()));
      } catch {
        // API unavailable — use whatever we have (empty or stale cache)
      } finally {
        setIsLoading(false);
      }
    };

    void fetchItems();

    return () => controller.abort();
  }, []);

  // Derive sorted category names
  const categories = Object.keys(catalog).sort((a, b) => a.localeCompare(b));

  return [catalog, isLoading, categories];
}
