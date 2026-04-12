import { useEffect, useState } from 'react';
import { MARKET_SLUG_CACHE_TTL_MS, STORAGE_KEYS, bundledMarketSlugsText } from '../constants';
import { extractMarketItemUrlNames, parseMarketSlugsText } from '../utils';

function readCachedMarketSlugs(): Set<string> {
  const bundledSlugs = parseMarketSlugsText(bundledMarketSlugsText);

  try {
    const cached = localStorage.getItem(STORAGE_KEYS.marketSlugs);
    const cachedTimestamp = Number(localStorage.getItem(STORAGE_KEYS.marketSlugsTimestamp) || '0');
    const isFresh = Boolean(cached) && Number.isFinite(cachedTimestamp) && Date.now() - cachedTimestamp < MARKET_SLUG_CACHE_TTL_MS;

    if (!isFresh || !cached) {
      return new Set(bundledSlugs);
    }

    const parsed = JSON.parse(cached) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return new Set(bundledSlugs);
    }

    return new Set([...bundledSlugs, ...parsed]);
  } catch {
    return new Set(bundledSlugs);
  }
}

export function useMarketSlugs(): Set<string> {
  const [marketSlugs, setMarketSlugs] = useState<Set<string>>(() => readCachedMarketSlugs());

  useEffect(() => {
    const controller = new AbortController();

    const loadMarketItems = async () => {
      try {
        const response = await fetch('https://api.warframe.market/v2/items', { signal: controller.signal });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const slugs = extractMarketItemUrlNames(payload);
        if (slugs.length === 0) {
          return;
        }

        setMarketSlugs(new Set(slugs));
        localStorage.setItem(STORAGE_KEYS.marketSlugs, JSON.stringify(slugs));
        localStorage.setItem(STORAGE_KEYS.marketSlugsTimestamp, String(Date.now()));
      } catch {
        // If the API is unavailable, the bundled and cached slugs remain usable.
      }
    };

    void loadMarketItems();

    return () => controller.abort();
  }, []);

  return marketSlugs;
}