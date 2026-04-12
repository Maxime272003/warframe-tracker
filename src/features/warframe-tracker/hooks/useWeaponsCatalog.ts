import { useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';
import { isWeaponCatalog } from '../utils';
import type { WeaponCatalog } from '../types';
import { usePersistentState } from './usePersistentState';

export function useWeaponsCatalog(fallbackCatalog: WeaponCatalog) {
  const [catalog, setCatalog] = usePersistentState<WeaponCatalog>(
    STORAGE_KEYS.weaponsCatalog,
    fallbackCatalog,
    (raw) => {
      try {
        const parsed = JSON.parse(raw) as unknown;
        return isWeaponCatalog(parsed) ? parsed : fallbackCatalog;
      } catch {
        return fallbackCatalog;
      }
    },
    (value) => JSON.stringify(value),
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadWeaponsFromPublicFile = async () => {
      if (
        catalog.warframe_weapons.primary.length > 0 ||
        catalog.warframe_weapons.secondary.length > 0 ||
        catalog.warframe_weapons.melee.length > 0
      ) {
        return;
      }

      try {
        const response = await fetch('/weapons.json', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const text = await response.text();
        if (!text.trim()) {
          return;
        }

        const parsed = JSON.parse(text) as unknown;
        if (isWeaponCatalog(parsed)) {
          setCatalog(parsed);
        }
      } catch {
        // Optional file: the app can still run with an empty catalog.
      }
    };

    void loadWeaponsFromPublicFile();

    return () => controller.abort();
  }, [catalog, setCatalog]);

  return [catalog, setCatalog] as const;
}